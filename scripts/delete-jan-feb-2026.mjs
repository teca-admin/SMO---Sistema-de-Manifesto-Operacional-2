import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://teca-admin-supabase.gf4wga.easypanel.host';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyAgCiAgICAicm9sZSI6ICJhbm9uIiwKICAgICJpc3MiOiAic3VwYWJhc2UtZGVtbyIsCiAgICAiaWF0IjogMTY0MTc2OTIwMCwKICAgICJleHAiOiAxNzk5NTM1NjAwCn0.dc_X5iR_VP_qT0zsiyj_I_OZ2T9FtRU2BBNWN8Bu4GE';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  db: { schema: 'smo' }
});

// Janiero e Fevereiro de 2026 — antes de 2026-03-01T00:00:00
const CORTE_ISO = '2026-03-01T00:00:00';

async function contarSistema() {
  const { count } = await supabase
    .from('SMO_Sistema')
    .select('*', { count: 'exact', head: true })
    .lt('Manifesto_Recebido', CORTE_ISO);
  return count ?? 0;
}

async function contarOperacional() {
  const { count } = await supabase
    .from('SMO_Operacional')
    .select('*', { count: 'exact', head: true })
    .lt('created_at', CORTE_ISO);
  return count ?? 0;
}

async function deletarSistema() {
  console.log('\nApagando SMO_Sistema (Manifesto_Recebido < 2026-03-01)...');
  let total = 0;
  while (true) {
    // Busca IDs em lote para deletar
    const { data, error } = await supabase
      .from('SMO_Sistema')
      .select('ID_Manifesto')
      .lt('Manifesto_Recebido', CORTE_ISO)
      .limit(500);
    if (error) { console.error('Erro ao buscar:', error.message); break; }
    if (!data || data.length === 0) break;

    const ids = data.map(r => r.ID_Manifesto);
    const { error: delErr, count } = await supabase
      .from('SMO_Sistema')
      .delete({ count: 'exact' })
      .in('ID_Manifesto', ids);
    if (delErr) { console.error('Erro ao deletar:', delErr.message); break; }
    total += count ?? ids.length;
    process.stdout.write(`\r  ${total} apagados...`);
  }
  console.log(`\n  → Total SMO_Sistema: ${total} registros apagados`);
  return total;
}

async function deletarOperacional() {
  console.log('\nApagando SMO_Operacional (created_at < 2026-03-01)...');
  let total = 0;
  while (true) {
    const { data, error } = await supabase
      .from('SMO_Operacional')
      .select('id')
      .lt('created_at', CORTE_ISO)
      .limit(500);
    if (error) { console.error('Erro ao buscar:', error.message); break; }
    if (!data || data.length === 0) break;

    const ids = data.map(r => r.id);
    const { error: delErr, count } = await supabase
      .from('SMO_Operacional')
      .delete({ count: 'exact' })
      .in('id', ids);
    if (delErr) { console.error('Erro ao deletar:', delErr.message); break; }
    total += count ?? ids.length;
    process.stdout.write(`\r  ${total} apagados...`);
  }
  console.log(`\n  → Total SMO_Operacional: ${total} registros apagados`);
  return total;
}

async function run() {
  console.log('\n=== EXCLUSÃO DE DADOS DE TESTE: JANEIRO E FEVEREIRO 2026 ===');
  console.log(`Critério: registros anteriores a ${CORTE_ISO}\n`);

  // Contagem prévia
  const [nSistema, nOper] = await Promise.all([contarSistema(), contarOperacional()]);
  console.log(`Encontrados para excluir:`);
  console.log(`  SMO_Sistema:     ${nSistema} registros`);
  console.log(`  SMO_Operacional: ${nOper} registros`);

  if (nSistema === 0 && nOper === 0) {
    console.log('\nNenhum registro encontrado. Nada a fazer.\n');
    process.exit(0);
  }

  console.log('\nConfirme que deseja prosseguir. Pressione CTRL+C para cancelar.');
  console.log('Aguardando 5 segundos...');
  await new Promise(r => setTimeout(r, 5000));

  const okSistema = await deletarSistema();
  const okOper = await deletarOperacional();

  console.log('\n=== CONCLUÍDO ===');
  console.log(`  SMO_Sistema:     ${okSistema} apagados`);
  console.log(`  SMO_Operacional: ${okOper} apagados`);
  console.log('\nDados de Janeiro e Fevereiro 2026 removidos com sucesso.\n');
}

run().catch(e => { console.error(e); process.exit(1); });
