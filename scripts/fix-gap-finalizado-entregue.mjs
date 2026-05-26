import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://teca-admin-supabase.gf4wga.easypanel.host';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyAgCiAgICAicm9sZSI6ICJhbm9uIiwKICAgICJpc3MiOiAic3VwYWJhc2UtZGVtbyIsCiAgICAiaWF0IjogMTY0MTc2OTIwMCwKICAgICJleHAiOiAxNzk5NTM1NjAwCn0.dc_X5iR_VP_qT0zsiyj_I_OZ2T9FtRU2BBNWN8Bu4GE';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, { db: { schema: 'smo' } });

const GAP_MIN_H = 6;
const GAP_MAX_H = 24;
const OFFSET_ASS_MIN = 5;   // Assinatura = Finalizado + 5 min
const OFFSET_ENT_SEC = 30;  // Entregue   = Assinatura + 30 seg

function parse(str) {
  if (!str || str === '---') return null;
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
  return null;
}

function toBR(dt) {
  const p = n => String(n).padStart(2, '0');
  return `${p(dt.getDate())}/${p(dt.getMonth() + 1)}/${dt.getFullYear()} ${p(dt.getHours())}:${p(dt.getMinutes())}:${p(dt.getSeconds())}`;
}

function addMin(dt, min) {
  return new Date(dt.getTime() + min * 60000);
}

function addSec(dt, sec) {
  return new Date(dt.getTime() + sec * 1000);
}

async function getNextOpId() {
  const { data } = await supabase.from('SMO_Operacional').select('id').order('id', { ascending: false }).limit(1);
  return (data?.[0]?.id ?? 0) + 1;
}

async function run() {
  console.log(`\n=== CORREÇÃO: GAP FINALIZADO→ENTREGUE ENTRE ${GAP_MIN_H}H E ${GAP_MAX_H}H ===\n`);

  // 1. Carrega todos os manifestos entregues
  let all = [], from = 0;
  while (true) {
    const { data, error } = await supabase
      .from('SMO_Sistema')
      .select('ID_Manifesto, CIA, Turno, Manifesto_Completo, Representante_CIA, Manifesto_Entregue')
      .eq('Status', 'Manifesto Entregue')
      .order('id', { ascending: true })
      .range(from, from + 999);
    if (error) { console.error(error.message); process.exit(1); }
    all = all.concat(data);
    if (data.length < 1000) break;
    from += 1000;
  }

  // 2. Filtra casos com gap entre GAP_MIN_H e GAP_MAX_H
  const casos = [];
  for (const r of all) {
    const dtFin = parse(r.Manifesto_Completo);
    const dtEnt = parse(r.Manifesto_Entregue);
    if (!dtFin || !dtEnt) continue;
    const gapH = (dtEnt - dtFin) / 3600000;
    if (gapH >= GAP_MIN_H && gapH <= GAP_MAX_H) {
      casos.push({ ...r, dtFin, gapH: Math.round(gapH * 10) / 10 });
    }
  }

  console.log(`Encontrados ${casos.length} casos para corrigir.\n`);
  console.log('Correção: Assinatura = Finalizado +5min | Entregue = Assinatura +30seg\n');
  console.log('─'.repeat(80));

  let ok = 0, fail = 0;

  for (const c of casos) {
    const novaAss = addMin(c.dtFin, OFFSET_ASS_MIN);
    const novaEnt = addSec(novaAss, OFFSET_ENT_SEC);
    const novaAssBR = toBR(novaAss);
    const novaEntBR = toBR(novaEnt);

    // 3a. Atualiza SMO_Sistema
    const { error: errSis } = await supabase
      .from('SMO_Sistema')
      .update({ Representante_CIA: novaAssBR, Manifesto_Entregue: novaEntBR })
      .eq('ID_Manifesto', c.ID_Manifesto);

    if (errSis) {
      console.log(`FALHA SMO_Sistema [${c.ID_Manifesto}]: ${errSis.message}`);
      fail++;
      continue;
    }

    // 3b. Atualiza SMO_Operacional — Assinatura Representante
    await supabase
      .from('SMO_Operacional')
      .update({ Created_At_BR: novaAssBR })
      .eq('ID_Manifesto', c.ID_Manifesto)
      .eq('Ação', 'Assinatura Representante');

    // 3c. Atualiza SMO_Operacional — Manifesto Entregue
    await supabase
      .from('SMO_Operacional')
      .update({ Created_At_BR: novaEntBR })
      .eq('ID_Manifesto', c.ID_Manifesto)
      .eq('Ação', 'Manifesto Entregue');

    // 3d. Registra correção no log
    const nextId = await getNextOpId();
    const agora = toBR(new Date());
    await supabase.from('SMO_Operacional').insert({
      id: nextId,
      ID_Manifesto: c.ID_Manifesto,
      'Ação': 'Correção de Data',
      Usuario: 'ADMIN',
      Justificativa: `Correção: gap Finalizado→Entregue era ${c.gapH}h. Assinatura ajustada para ${novaAssBR}, Entregue para ${novaEntBR}.`,
      Created_At_BR: agora,
    });

    ok++;
    process.stdout.write(`\r  ${ok + fail}/${casos.length} — ${c.ID_Manifesto} (gap era ${c.gapH}h) ✓`);
  }

  console.log(`\n\n=== CONCLUÍDO: ${ok} corrigidos, ${fail} falhas ===\n`);
}

run().catch(e => { console.error(e); process.exit(1); });
