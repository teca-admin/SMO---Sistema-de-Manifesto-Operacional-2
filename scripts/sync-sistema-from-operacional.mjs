import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://teca-admin-supabase.gf4wga.easypanel.host';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyAgCiAgICAicm9sZSI6ICJhbm9uIiwKICAgICJpc3MiOiAic3VwYWJhc2UtZGVtbyIsCiAgICAiaWF0IjogMTY0MTc2OTIwMCwKICAgICJleHAiOiAxNzk5NTM1NjAwCn0.dc_X5iR_VP_qT0zsiyj_I_OZ2T9FtRU2BBNWN8Bu4GE';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  db: { schema: 'smo' }
});

// Mapeia ação do SMO_Operacional → campo no SMO_Sistema
const ACAO_TO_CAMPO = {
  'Manifesto Iniciado':       'Manifesto_Iniciado',
  'Manifesto Finalizado':     'Manifesto_Completo',
  'Assinatura Representante': 'Representante_CIA',
  'Manifesto Entregue':       'Manifesto_Entregue',
};

// Converte qualquer formato de data para ISO sem fuso (para gravar no Postgres)
function toISO(dateStr) {
  if (!dateStr) return null;
  try {
    if (dateStr.includes('/')) {
      const parts = dateStr.split(/[\/\s,:]+/).filter(Boolean);
      if (parts.length >= 5) {
        const [d, m, y, h, min, s = '0'] = parts;
        const dt = new Date(+y, +m - 1, +d, +h, +min, +s);
        if (!isNaN(dt.getTime())) return formatISO(dt);
      }
    }
    const direct = new Date(dateStr);
    if (!isNaN(direct.getTime())) return formatISO(direct);
    const isoMatch = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})/);
    if (isoMatch) {
      const [, y, m, d, h, min, s] = isoMatch;
      const dt = new Date(+y, +m - 1, +d, +h, +min, +s);
      if (!isNaN(dt.getTime())) return formatISO(dt);
    }
    return null;
  } catch { return null; }
}

function formatISO(dt) {
  const pad = n => String(n).padStart(2, '0');
  return `${dt.getFullYear()}-${pad(dt.getMonth()+1)}-${pad(dt.getDate())}T${pad(dt.getHours())}:${pad(dt.getMinutes())}:${pad(dt.getSeconds())}`;
}

// Compara duas datas (tolerância de 60 segundos para variações normais)
function difereSignificativamente(isoSistema, isoOperacional) {
  if (!isoSistema || !isoOperacional) return false;
  const a = new Date(isoSistema).getTime();
  const b = new Date(isoOperacional).getTime();
  if (isNaN(a) || isNaN(b)) return false;
  return Math.abs(a - b) > 60000; // mais de 60 segundos de diferença
}

async function run() {
  console.log('\n=== SINCRONIZAÇÃO SMO_Sistema ↔ SMO_Operacional ===\n');

  // 1. Carrega todos os logs operacionais (paginado)
  console.log('Carregando SMO_Operacional...');
  let allLogs = [];
  let from = 0;
  const PAGE = 1000;
  while (true) {
    const { data, error } = await supabase
      .from('SMO_Operacional')
      .select('id, ID_Manifesto, Ação, Created_At_BR')
      .order('id', { ascending: true })
      .range(from, from + PAGE - 1);
    if (error) { console.error('Erro SMO_Operacional:', error.message); process.exit(1); }
    allLogs = allLogs.concat(data);
    if (data.length < PAGE) break;
    from += PAGE;
  }
  console.log(`  → ${allLogs.length} logs carregados`);

  // 2. Agrupa por manifesto, pega PRIMEIRO de cada ação crítica
  const primeirosPorManifesto = {};
  for (const log of allLogs) {
    const campo = ACAO_TO_CAMPO[log['Ação']];
    if (!campo) continue;
    const id = log.ID_Manifesto;
    if (!primeirosPorManifesto[id]) primeirosPorManifesto[id] = {};
    if (!primeirosPorManifesto[id][campo]) {
      primeirosPorManifesto[id][campo] = toISO(log.Created_At_BR);
    }
  }

  // 3. Carrega SMO_Sistema para todos os manifestos que têm log
  const manifestoIds = Object.keys(primeirosPorManifesto);
  console.log(`\nVerificando ${manifestoIds.length} manifestos no SMO_Sistema...`);

  let todosSistema = [];
  for (let i = 0; i < manifestoIds.length; i += 500) {
    const lote = manifestoIds.slice(i, i + 500);
    const { data, error } = await supabase
      .from('SMO_Sistema')
      .select('ID_Manifesto, Manifesto_Iniciado, Manifesto_Completo, Representante_CIA, Manifesto_Entregue')
      .in('ID_Manifesto', lote);
    if (error) { console.error('Erro SMO_Sistema:', error.message); process.exit(1); }
    todosSistema = todosSistema.concat(data);
  }
  console.log(`  → ${todosSistema.length} registros carregados`);

  // 4. Identifica discrepâncias
  const correcoes = [];
  for (const row of todosSistema) {
    const mId = row.ID_Manifesto;
    const esperado = primeirosPorManifesto[mId];
    if (!esperado) continue;

    const update = {};
    for (const [campo, isoCorreto] of Object.entries(esperado)) {
      if (!isoCorreto) continue;
      const isoAtual = row[campo];
      if (difereSignificativamente(isoAtual, isoCorreto)) {
        update[campo] = isoCorreto;
      }
    }

    if (Object.keys(update).length > 0) {
      correcoes.push({ id: mId, update, antes: row });
    }
  }

  if (correcoes.length === 0) {
    console.log('\nNenhuma discrepância encontrada. SMO_Sistema já está consistente.\n');
    process.exit(0);
  }

  console.log(`\nEncontradas ${correcoes.length} discrepâncias a corrigir:`);
  correcoes.forEach(c => {
    console.log(`\n  [${c.id}]`);
    for (const [campo, novoValor] of Object.entries(c.update)) {
      console.log(`    ${campo}`);
      console.log(`      ANTES:  ${c.antes[campo] || '---'}`);
      console.log(`      DEPOIS: ${novoValor}`);
    }
  });

  console.log('\nAplicando correções...\n');
  let ok = 0, fail = 0;
  for (const c of correcoes) {
    const { error } = await supabase
      .from('SMO_Sistema')
      .update(c.update)
      .eq('ID_Manifesto', c.id);
    if (error) {
      console.error(`  FALHA [${c.id}]: ${error.message}`);
      fail++;
    } else {
      ok++;
      process.stdout.write(`\r  Progresso: ${ok + fail}/${correcoes.length}   `);
    }
  }

  console.log(`\n\n=== CONCLUÍDO: ${ok} corrigidos, ${fail} falhas ===\n`);
}

run();
