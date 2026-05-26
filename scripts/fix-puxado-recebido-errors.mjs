import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://teca-admin-supabase.gf4wga.easypanel.host';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyAgCiAgICAicm9sZSI6ICJhbm9uIiwKICAgICJpc3MiOiAic3VwYWJhc2UtZGVtbyIsCiAgICAiaWF0IjogMTY0MTc2OTIwMCwKICAgICJleHAiOiAxNzk5NTM1NjAwCn0.dc_X5iR_VP_qT0zsiyj_I_OZ2T9FtRU2BBNWN8Bu4GE';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, { db: { schema: 'smo' } });

const CORRECOES = [
  {
    id: 'MAO-260004046',
    descricao: 'Puxado com mês errado: novembro→abril, dia 10 (antes do Iniciado em 11/04)',
    campo: 'Manifesto_Puxado',
    valorAtual: '2026-11-06T11:20:00-04:00',
    valorCorreto: '10/04/2026 11:20:00',
  },
  {
    id: 'MAO-260005813',
    descricao: 'Recebido em 28/05 mas todos os demais estão em 21/05 — data errada',
    campo: 'Manifesto_Recebido',
    valorAtual: '2026-05-28T08:16:00.000Z',
    valorCorreto: '21/05/2026 04:16:00',
  },
  {
    id: 'MAO-260005634',
    descricao: 'Puxado em 14/05 mas todo o fluxo ocorreu em 16/05 — data errada',
    campo: 'Manifesto_Puxado',
    valorAtual: '2026-05-14T16:20:00-04:00',
    valorCorreto: '16/05/2026 14:18:00',
  },
];

async function getNextId(tabela) {
  const { data } = await supabase.from(tabela).select('id').order('id', { ascending: false }).limit(1);
  return data?.[0]?.id ? data[0].id + 1 : 1;
}

async function run() {
  console.log('\n=== CORREÇÃO DE DATAS: PUXADO / RECEBIDO ===\n');

  for (const c of CORRECOES) {
    console.log(`[${c.id}] ${c.descricao}`);
    console.log(`  Campo:  ${c.campo}`);
    console.log(`  Antes:  ${c.valorAtual}`);
    console.log(`  Depois: ${c.valorCorreto}`);

    const { error } = await supabase
      .from('SMO_Sistema')
      .update({ [c.campo]: c.valorCorreto })
      .eq('ID_Manifesto', c.id);

    if (error) {
      console.log(`  ❌ FALHA: ${error.message}\n`);
      continue;
    }

    // Registra no log operacional
    const nextId = await getNextId('SMO_Operacional');
    const now = new Date();
    const p = n => String(n).padStart(2, '0');
    const nowBR = `${p(now.getDate())}/${p(now.getMonth()+1)}/${now.getFullYear()} ${p(now.getHours())}:${p(now.getMinutes())}:${p(now.getSeconds())}`;

    await supabase.from('SMO_Operacional').insert({
      id: nextId,
      ID_Manifesto: c.id,
      'Ação': 'Correção de Data',
      Usuario: 'ADMIN',
      Justificativa: `Correção: ${c.campo} de "${c.valorAtual}" para "${c.valorCorreto}". ${c.descricao}`,
      Created_At_BR: nowBR,
    });

    console.log(`  ✓ Corrigido\n`);
  }

  console.log('=== CONCLUÍDO ===\n');
}

run().catch(e => { console.error(e); process.exit(1); });
