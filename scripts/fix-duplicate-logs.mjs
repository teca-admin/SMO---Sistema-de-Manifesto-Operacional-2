import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://teca-admin-supabase.gf4wga.easypanel.host';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyAgCiAgICAicm9sZSI6ICJhbm9uIiwKICAgICJpc3MiOiAic3VwYWJhc2UtZGVtbyIsCiAgICAiaWF0IjogMTY0MTc2OTIwMCwKICAgICJleHAiOiAxNzk5NTM1NjAwCn0.dc_X5iR_VP_qT0zsiyj_I_OZ2T9FtRU2BBNWN8Bu4GE';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  db: { schema: 'smo' }
});

const ACOES_CRITICAS = [
  'Manifesto Iniciado',
  'Manifesto Finalizado',
  'Assinatura Representante',
  'Manifesto Entregue',
];

async function run() {
  console.log('\n=== LIMPEZA DE DUPLICIDADE NO SMO_Operacional ===\n');
  console.log('Buscando todos os registros...');

  // Busca em páginas para evitar limite de 1000 registros
  let allData = [];
  let from = 0;
  const PAGE_SIZE = 1000;

  while (true) {
    const { data, error } = await supabase
      .from('SMO_Operacional')
      .select('id, ID_Manifesto, Ação, Created_At_BR')
      .order('id', { ascending: true })
      .range(from, from + PAGE_SIZE - 1);

    if (error) {
      console.error('ERRO ao buscar registros:', error.message);
      process.exit(1);
    }

    allData = allData.concat(data);
    if (data.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }

  console.log(`Total de registros carregados: ${allData.length}\n`);

  // Agrupa por manifesto
  const byManifesto = {};
  for (const row of allData) {
    const id = row.ID_Manifesto;
    if (!byManifesto[id]) byManifesto[id] = [];
    byManifesto[id].push(row);
  }

  const idsParaDeletar = [];

  for (const [manifestoId, logs] of Object.entries(byManifesto)) {
    for (const acao of ACOES_CRITICAS) {
      const matches = logs.filter(l => l['Ação'] === acao);
      if (matches.length <= 1) continue;

      // Mantém o primeiro (menor id), deleta os demais
      const [primeiro, ...duplicatas] = matches;
      for (const dup of duplicatas) {
        idsParaDeletar.push({ id: dup.id, manifestoId, acao, dataHora: dup.Created_At_BR });
      }
    }
  }

  if (idsParaDeletar.length === 0) {
    console.log('Nenhuma duplicidade encontrada. Banco de dados OK.\n');
    process.exit(0);
  }

  console.log(`Encontrados ${idsParaDeletar.length} registros duplicados para deletar.\n`);

  // Deleta em lotes de 50
  const BATCH = 50;
  let deletados = 0;
  let falhas = 0;

  for (let i = 0; i < idsParaDeletar.length; i += BATCH) {
    const lote = idsParaDeletar.slice(i, i + BATCH);
    const ids = lote.map(r => r.id);

    const { error } = await supabase
      .from('SMO_Operacional')
      .delete()
      .in('id', ids);

    if (error) {
      console.error(`  FALHA no lote ${Math.floor(i / BATCH) + 1}: ${error.message}`);
      falhas += lote.length;
    } else {
      deletados += lote.length;
      const pct = Math.round((deletados / idsParaDeletar.length) * 100);
      process.stdout.write(`\r  Progresso: ${deletados}/${idsParaDeletar.length} (${pct}%)   `);
    }
  }

  console.log(`\n\n=== CONCLUÍDO: ${deletados} deletados, ${falhas} falhas ===\n`);
}

run();
