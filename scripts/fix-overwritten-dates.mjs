import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://teca-admin-supabase.gf4wga.easypanel.host';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyAgCiAgICAicm9sZSI6ICJhbm9uIiwKICAgICJpc3MiOiAic3VwYWJhc2UtZGVtbyIsCiAgICAiaWF0IjogMTY0MTc2OTIwMCwKICAgICJleHAiOiAxNzk5NTM1NjAwCn0.dc_X5iR_VP_qT0zsiyj_I_OZ2T9FtRU2BBNWN8Bu4GE';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  db: { schema: 'smo' }
});

const ACAO_TO_CAMPO = {
  'Manifesto Iniciado':       'Manifesto_Iniciado',
  'Manifesto Finalizado':     'Manifesto_Completo',
  'Assinatura Representante': 'Representante_CIA',
  'Manifesto Entregue':       'Manifesto_Entregue',
};

// Parse robusto: trata BR (DD/MM/YYYY) e ISO corretamente
function parseData(str) {
  if (!str) return null;
  try {
    if (str.includes('/')) {
      const parts = str.split(/[\/\s,:]+/).filter(Boolean);
      if (parts.length >= 5) {
        const [d, m, y, h, min, s = '0'] = parts;
        const dt = new Date(+y, +m - 1, +d, +h, +min, +s);
        return isNaN(dt.getTime()) ? null : dt;
      }
    }
    const isoMatch = str.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})/);
    if (isoMatch) {
      const [, y, m, d, h, min, s] = isoMatch;
      const dt = new Date(+y, +m - 1, +d, +h, +min, +s);
      return isNaN(dt.getTime()) ? null : dt;
    }
    const direct = new Date(str);
    return isNaN(direct.getTime()) ? null : direct;
  } catch { return null; }
}

function toISO(dt) {
  if (!dt) return null;
  const p = n => String(n).padStart(2, '0');
  return `${dt.getFullYear()}-${p(dt.getMonth()+1)}-${p(dt.getDate())}T${p(dt.getHours())}:${p(dt.getMinutes())}:${p(dt.getSeconds())}`;
}

async function run() {
  console.log('\n=== CORREÇÃO DE DATAS SOBRESCRITAS (SMO_Sistema) ===\n');

  // 1. Carrega todos os logs operacionais
  console.log('Carregando SMO_Operacional...');
  let allLogs = [];
  let from = 0;
  while (true) {
    const { data, error } = await supabase
      .from('SMO_Operacional')
      .select('id, ID_Manifesto, Ação, Created_At_BR')
      .order('id', { ascending: true })
      .range(from, from + 999);
    if (error) { console.error(error.message); process.exit(1); }
    allLogs = allLogs.concat(data);
    if (data.length < 1000) break;
    from += 1000;
  }
  console.log(`  → ${allLogs.length} logs`);

  // 2. Primeiro registro de cada ação crítica por manifesto
  const primeiros = {};
  for (const log of allLogs) {
    const campo = ACAO_TO_CAMPO[log['Ação']];
    if (!campo) continue;
    const id = log.ID_Manifesto;
    if (!primeiros[id]) primeiros[id] = {};
    if (!primeiros[id][campo]) {
      const dt = parseData(log.Created_At_BR);
      primeiros[id][campo] = dt ? toISO(dt) : null;
    }
  }

  const manifestoIds = Object.keys(primeiros);

  // 3. Carrega SMO_Sistema em lotes
  console.log(`Verificando ${manifestoIds.length} manifestos...`);
  let todosSistema = [];
  for (let i = 0; i < manifestoIds.length; i += 500) {
    const { data, error } = await supabase
      .from('SMO_Sistema')
      .select('ID_Manifesto, Manifesto_Iniciado, Manifesto_Completo, Representante_CIA, Manifesto_Entregue')
      .in('ID_Manifesto', manifestoIds.slice(i, i + 500));
    if (error) { console.error(error.message); process.exit(1); }
    todosSistema = todosSistema.concat(data);
  }

  // 4. Identifica divergências usando parse robusto nos dois lados
  const correcoes = [];
  for (const row of todosSistema) {
    const esperado = primeiros[row.ID_Manifesto];
    if (!esperado) continue;

    const update = {};
    for (const [campo, isoCorreto] of Object.entries(esperado)) {
      if (!isoCorreto) continue;
      const dtSistema = parseData(row[campo]);
      const dtCorreto = parseData(isoCorreto);
      if (!dtSistema || !dtCorreto) continue;
      const diffMs = Math.abs(dtSistema.getTime() - dtCorreto.getTime());
      if (diffMs > 60000) { // divergência real > 60 segundos
        update[campo] = isoCorreto;
      }
    }

    if (Object.keys(update).length > 0) {
      correcoes.push({ id: row.ID_Manifesto, update, atual: row });
    }
  }

  if (correcoes.length === 0) {
    console.log('\nNenhuma divergência encontrada. Tudo OK.\n');
    process.exit(0);
  }

  console.log(`\nEncontradas ${correcoes.length} divergências:\n`);
  correcoes.forEach(c => {
    console.log(`  [${c.id}]`);
    for (const [campo, novo] of Object.entries(c.update)) {
      console.log(`    ${campo}: ${c.atual[campo]} → ${novo}`);
    }
  });

  console.log('\nAplicando correções...');
  let ok = 0, fail = 0;
  for (const c of correcoes) {
    const { error } = await supabase
      .from('SMO_Sistema')
      .update(c.update)
      .eq('ID_Manifesto', c.id);
    if (error) { console.error(`  FALHA [${c.id}]: ${error.message}`); fail++; }
    else { ok++; process.stdout.write(`\r  ${ok + fail}/${correcoes.length}`); }
  }

  console.log(`\n\n=== CONCLUÍDO: ${ok} corrigidos, ${fail} falhas ===\n`);
}

run();
