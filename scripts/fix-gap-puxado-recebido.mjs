import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://teca-admin-supabase.gf4wga.easypanel.host';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyAgCiAgICAicm9sZSI6ICJhbm9uIiwKICAgICJpc3MiOiAic3VwYWJhc2UtZGVtbyIsCiAgICAiaWF0IjogMTY0MTc2OTIwMCwKICAgICJleHAiOiAxNzk5NTM1NjAwCn0.dc_X5iR_VP_qT0zsiyj_I_OZ2T9FtRU2BBNWN8Bu4GE';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, { db: { schema: 'smo' } });

const GAP_MIN_H      = 6;
const OFFSET_REC_MIN = 30; // Recebido = Puxado + 30 min

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

async function getNextOpId() {
  const { data } = await supabase.from('SMO_Operacional').select('id').order('id', { ascending: false }).limit(1);
  return (data?.[0]?.id ?? 0) + 1;
}

async function run() {
  console.log(`\n=== CORREÇÃO: GAP PUXADO→RECEBIDO ≥ ${GAP_MIN_H}H ===\n`);

  let all = [], from = 0;
  while (true) {
    const { data, error } = await supabase
      .from('SMO_Sistema')
      .select('ID_Manifesto, CIA, Turno, Manifesto_Puxado, Manifesto_Recebido')
      .not('Manifesto_Puxado', 'is', null)
      .not('Manifesto_Recebido', 'is', null)
      .order('id', { ascending: true })
      .range(from, from + 999);
    if (error) { console.error(error.message); process.exit(1); }
    all = all.concat(data);
    if (data.length < 1000) break;
    from += 1000;
  }

  const casos = [];
  for (const r of all) {
    const dtPux = parse(r.Manifesto_Puxado);
    const dtRec = parse(r.Manifesto_Recebido);
    if (!dtPux || !dtRec) continue;
    const gapH = (dtRec - dtPux) / 3600000;
    if (gapH >= GAP_MIN_H) {
      casos.push({ ...r, dtPux, gapH: Math.round(gapH * 10) / 10 });
    }
  }

  console.log(`Encontrados ${casos.length} casos para corrigir.\n`);
  console.log(`Correção: Recebido = Puxado +${OFFSET_REC_MIN}min\n`);
  console.log('─'.repeat(80));

  let ok = 0, fail = 0;

  for (const c of casos) {
    const novoRec = addMin(c.dtPux, OFFSET_REC_MIN);
    const novoRecBR = toBR(novoRec);

    // Atualiza SMO_Sistema
    const { error: errSis } = await supabase
      .from('SMO_Sistema')
      .update({ Manifesto_Recebido: novoRecBR })
      .eq('ID_Manifesto', c.ID_Manifesto);

    if (errSis) {
      console.log(`\nFALHA SMO_Sistema [${c.ID_Manifesto}]: ${errSis.message}`);
      fail++;
      continue;
    }

    // Atualiza SMO_Operacional — Manifesto Recebido
    await supabase
      .from('SMO_Operacional')
      .update({ Created_At_BR: novoRecBR })
      .eq('ID_Manifesto', c.ID_Manifesto)
      .eq('Ação', 'Manifesto Recebido');

    // Registra correção no log
    const nextId = await getNextOpId();
    const agora = toBR(new Date());
    await supabase.from('SMO_Operacional').insert({
      id: nextId,
      ID_Manifesto: c.ID_Manifesto,
      'Ação': 'Correção de Data',
      Usuario: 'ADMIN',
      Justificativa: `Correção: gap Puxado→Recebido era ${c.gapH}h. Recebido ajustado para ${novoRecBR}.`,
      Created_At_BR: agora,
    });

    ok++;
    process.stdout.write(`\r  ${ok + fail}/${casos.length} — ${c.ID_Manifesto} (gap era ${c.gapH}h) ✓`);
  }

  console.log(`\n\n=== CONCLUÍDO: ${ok} corrigidos, ${fail} falhas ===\n`);
}

run().catch(e => { console.error(e); process.exit(1); });
