import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://teca-admin-supabase.gf4wga.easypanel.host';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyAgCiAgICAicm9sZSI6ICJhbm9uIiwKICAgICJpc3MiOiAic3VwYWJhc2UtZGVtbyIsCiAgICAiaWF0IjogMTY0MTc2OTIwMCwKICAgICJleHAiOiAxNzk5NTM1NjAwCn0.dc_X5iR_VP_qT0zsiyj_I_OZ2T9FtRU2BBNWN8Bu4GE';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, { db: { schema: 'smo' } });

function parse(str) {
  if (!str || str === '---' || str === '') return null;
  try {
    if (str.includes('/')) {
      const p = str.split(/[\/\s,:]+/).filter(Boolean);
      if (p.length >= 5) {
        const [d, m, y, h, mi, s = '0'] = p;
        const dt = new Date(+y, +m - 1, +d, +h, +mi, +s);
        return isNaN(dt.getTime()) ? null : dt;
      }
    }
    const iso = str.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})/);
    if (iso) {
      const [, y, m, d, h, mi, s] = iso;
      const dt = new Date(+y, +m - 1, +d, +h, +mi, +s);
      return isNaN(dt.getTime()) ? null : dt;
    }
    const direct = new Date(str);
    return isNaN(direct.getTime()) ? null : direct;
  } catch { return null; }
}

function fmt(dt) {
  if (!dt) return '---';
  const p = n => String(n).padStart(2, '0');
  return `${p(dt.getDate())}/${p(dt.getMonth()+1)}/${dt.getFullYear()} ${p(dt.getHours())}:${p(dt.getMinutes())}:${p(dt.getSeconds())}`;
}

async function run() {
  console.log('\n=== INVESTIGAÇÃO: GAP ENTRE MANIFESTO INICIADO E MANIFESTO FINALIZADO ===\n');

  let all = [], from = 0;
  while (true) {
    const { data, error } = await supabase
      .from('SMO_Sistema')
      .select('ID_Manifesto, CIA, Turno, Status, Usuario_Sistema, Manifesto_Puxado, Manifesto_Recebido, Manifesto_Iniciado, Manifesto_Completo, Representante_CIA, Manifesto_Entregue')
      .not('Manifesto_Iniciado', 'is', null)
      .not('Manifesto_Completo', 'is', null)
      .order('id', { ascending: true })
      .range(from, from + 999);
    if (error) { console.error(error.message); process.exit(1); }
    all = all.concat(data);
    if (data.length < 1000) break;
    from += 1000;
  }

  console.log(`Total carregado: ${all.length} manifestos com Iniciado e Finalizado\n`);

  const casos = [];
  for (const r of all) {
    const dtIni = parse(r.Manifesto_Iniciado);
    const dtFin = parse(r.Manifesto_Completo);
    if (!dtIni || !dtFin) continue;
    const gapH = (dtFin - dtIni) / 3600000;
    if (gapH < 0) {
      // Finalizado ANTES de Iniciado — também é erro
      casos.push({ ...r, dtIni, dtFin, gapH: Math.round(gapH * 10) / 10, tipo: 'INVERTIDO' });
    } else if (gapH >= 6) {
      casos.push({ ...r, dtIni, dtFin, gapH: Math.round(gapH * 10) / 10, tipo: 'GAP_GRANDE' });
    }
  }

  // Separa por tipo
  const invertidos = casos.filter(c => c.tipo === 'INVERTIDO');
  const grandes = casos.filter(c => c.tipo === 'GAP_GRANDE');

  // Distribuição dos gaps grandes
  const buckets = { '6-12h': 0, '12-24h': 0, '24-48h': 0, '>48h': 0 };
  for (const c of grandes) {
    if (c.gapH < 12) buckets['6-12h']++;
    else if (c.gapH < 24) buckets['12-24h']++;
    else if (c.gapH < 48) buckets['24-48h']++;
    else buckets['>48h']++;
  }

  console.log('=== DISTRIBUIÇÃO DOS GAPS (Iniciado → Finalizado) ===\n');
  console.log(`  Gap ≥ 6h  : ${grandes.length} casos`);
  console.log(`    6h–12h  : ${buckets['6-12h']}`);
  console.log(`    12h–24h : ${buckets['12-24h']}`);
  console.log(`    24h–48h : ${buckets['24-48h']}`);
  console.log(`    > 48h   : ${buckets['>48h']}`);
  console.log(`\n  Invertidos (Finalizado < Iniciado): ${invertidos.length} casos`);

  // Top 20 maiores gaps
  grandes.sort((a, b) => b.gapH - a.gapH);
  console.log('\n=== TOP 20 MAIORES GAPS ===\n');
  console.log('─'.repeat(100));
  for (const c of grandes.slice(0, 20)) {
    console.log(`\n  ID: ${c.ID_Manifesto}   CIA: ${c.CIA}   Turno: ${c.Turno}   Status: ${c.Status}`);
    console.log(`  Cadastrado por: ${c.Usuario_Sistema}`);
    console.log(`  Manifesto Iniciado  : ${fmt(c.dtIni)}`);
    console.log(`  Manifesto Finalizado: ${fmt(c.dtFin)}`);
    console.log(`  GAP: ${c.gapH}h`);
  }

  if (invertidos.length > 0) {
    console.log('\n\n=== CASOS INVERTIDOS (Finalizado < Iniciado) ===\n');
    console.log('─'.repeat(100));
    for (const c of invertidos) {
      console.log(`\n  ID: ${c.ID_Manifesto}   CIA: ${c.CIA}   Status: ${c.Status}`);
      console.log(`  Manifesto Iniciado  : ${fmt(c.dtIni)}`);
      console.log(`  Manifesto Finalizado: ${fmt(c.dtFin)}`);
      console.log(`  GAP: ${c.gapH}h`);
    }
  }

  // Exporta CSV
  const linhas = ['ID_Manifesto,CIA,Status,Turno,Usuario,Iniciado,Finalizado,Gap_H,Tipo'];
  for (const c of casos) {
    linhas.push([c.ID_Manifesto, c.CIA, c.Status, c.Turno, c.Usuario_Sistema,
      fmt(c.dtIni), fmt(c.dtFin), c.gapH, c.tipo].join(','));
  }
  const fs = await import('fs');
  fs.writeFileSync('./scripts/iniciado-finalizado-gap.csv', linhas.join('\n'), 'utf8');
  console.log('\n\nCSV exportado: scripts/iniciado-finalizado-gap.csv\n');
  console.log(`Total geral: ${casos.length} casos anômalos (${grandes.length} gap grande + ${invertidos.length} invertidos)\n`);
}

run().catch(e => { console.error(e); process.exit(1); });
