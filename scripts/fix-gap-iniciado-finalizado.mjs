import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://teca-admin-supabase.gf4wga.easypanel.host';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyAgCiAgICAicm9sZSI6ICJhbm9uIiwKICAgICJpc3MiOiAic3VwYWJhc2UtZGVtbyIsCiAgICAiaWF0IjogMTY0MTc2OTIwMCwKICAgICJleHAiOiAxNzk5NTM1NjAwCn0.dc_X5iR_VP_qT0zsiyj_I_OZ2T9FtRU2BBNWN8Bu4GE';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, { db: { schema: 'smo' } });

const GAP_MIN_H      = 6;
const OFFSET_FIN_MIN = 30;  // Finalizado   = Iniciado + 30 min
const OFFSET_ASS_MIN = 5;   // Assinatura   = Finalizado + 5 min
const OFFSET_ENT_SEC = 30;  // Entregue     = Assinatura + 30 seg

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

function toBR(dt) {
  const p = n => String(n).padStart(2, '0');
  return `${p(dt.getDate())}/${p(dt.getMonth()+1)}/${dt.getFullYear()} ${p(dt.getHours())}:${p(dt.getMinutes())}:${p(dt.getSeconds())}`;
}

function addMin(dt, min) { return new Date(dt.getTime() + min * 60000); }
function addSec(dt, sec) { return new Date(dt.getTime() + sec * 1000); }

async function getNextOpId() {
  const { data } = await supabase.from('SMO_Operacional').select('id').order('id', { ascending: false }).limit(1);
  return (data?.[0]?.id ?? 0) + 1;
}

async function run() {
  console.log(`\n=== CORREÇÃO: GAP INICIADO→FINALIZADO ≥ ${GAP_MIN_H}H ===\n`);

  // 1. Carrega todos os manifestos com Iniciado e Completo
  let all = [], from = 0;
  while (true) {
    const { data, error } = await supabase
      .from('SMO_Sistema')
      .select('ID_Manifesto, CIA, Turno, Manifesto_Iniciado, Manifesto_Completo, Representante_CIA, Manifesto_Entregue')
      .not('Manifesto_Iniciado', 'is', null)
      .not('Manifesto_Completo', 'is', null)
      .order('id', { ascending: true })
      .range(from, from + 999);
    if (error) { console.error(error.message); process.exit(1); }
    all = all.concat(data);
    if (data.length < 1000) break;
    from += 1000;
  }

  // 2. Filtra casos com gap >= GAP_MIN_H
  const casos = [];
  for (const r of all) {
    const dtIni = parse(r.Manifesto_Iniciado);
    const dtFin = parse(r.Manifesto_Completo);
    if (!dtIni || !dtFin) continue;
    const gapH = (dtFin - dtIni) / 3600000;
    if (gapH >= GAP_MIN_H) {
      casos.push({ ...r, dtIni, gapH: Math.round(gapH * 10) / 10 });
    }
  }

  console.log(`Encontrados ${casos.length} casos para corrigir.\n`);
  console.log(`Correção: Finalizado = Iniciado +${OFFSET_FIN_MIN}min | Assinatura = Finalizado +${OFFSET_ASS_MIN}min | Entregue = Assinatura +${OFFSET_ENT_SEC}seg\n`);
  console.log('─'.repeat(80));

  let ok = 0, fail = 0;

  for (const c of casos) {
    const novaFin = addMin(c.dtIni, OFFSET_FIN_MIN);
    const novaAss = addMin(novaFin, OFFSET_ASS_MIN);
    const novaEnt = addSec(novaAss, OFFSET_ENT_SEC);

    const novaFinBR = toBR(novaFin);
    const novaAssBR = toBR(novaAss);
    const novaEntBR = toBR(novaEnt);

    // 3a. Atualiza SMO_Sistema (Completo + Representante + Entregue)
    const { error: errSis } = await supabase
      .from('SMO_Sistema')
      .update({
        Manifesto_Completo: novaFinBR,
        Representante_CIA: novaAssBR,
        Manifesto_Entregue: novaEntBR,
      })
      .eq('ID_Manifesto', c.ID_Manifesto);

    if (errSis) {
      console.log(`\nFALHA SMO_Sistema [${c.ID_Manifesto}]: ${errSis.message}`);
      fail++;
      continue;
    }

    // 3b. Atualiza SMO_Operacional — Manifesto Finalizado
    await supabase
      .from('SMO_Operacional')
      .update({ Created_At_BR: novaFinBR })
      .eq('ID_Manifesto', c.ID_Manifesto)
      .eq('Ação', 'Manifesto Finalizado');

    // 3c. Atualiza SMO_Operacional — Assinatura Representante
    await supabase
      .from('SMO_Operacional')
      .update({ Created_At_BR: novaAssBR })
      .eq('ID_Manifesto', c.ID_Manifesto)
      .eq('Ação', 'Assinatura Representante');

    // 3d. Atualiza SMO_Operacional — Manifesto Entregue
    await supabase
      .from('SMO_Operacional')
      .update({ Created_At_BR: novaEntBR })
      .eq('ID_Manifesto', c.ID_Manifesto)
      .eq('Ação', 'Manifesto Entregue');

    // 3e. Registra correção no log
    const nextId = await getNextOpId();
    const agora = toBR(new Date());
    await supabase.from('SMO_Operacional').insert({
      id: nextId,
      ID_Manifesto: c.ID_Manifesto,
      'Ação': 'Correção de Data',
      Usuario: 'ADMIN',
      Justificativa: `Correção: gap Iniciado→Finalizado era ${c.gapH}h. Finalizado ajustado para ${novaFinBR}, Assinatura para ${novaAssBR}, Entregue para ${novaEntBR}.`,
      Created_At_BR: agora,
    });

    ok++;
    process.stdout.write(`\r  ${ok + fail}/${casos.length} — ${c.ID_Manifesto} (gap era ${c.gapH}h) ✓`);
  }

  console.log(`\n\n=== CONCLUÍDO: ${ok} corrigidos, ${fail} falhas ===\n`);
}

run().catch(e => { console.error(e); process.exit(1); });
