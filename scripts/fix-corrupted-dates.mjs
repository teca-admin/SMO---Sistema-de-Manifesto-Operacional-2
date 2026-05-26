import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://teca-admin-supabase.gf4wga.easypanel.host';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyAgCiAgICAicm9sZSI6ICJhbm9uIiwKICAgICJpc3MiOiAic3VwYWJhc2UtZGVtbyIsCiAgICAiaWF0IjogMTY0MTc2OTIwMCwKICAgICJleHAiOiAxNzk5NTM1NjAwCn0.dc_X5iR_VP_qT0zsiyj_I_OZ2T9FtRU2BBNWN8Bu4GE';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  db: { schema: 'smo' }
});

// Extrai o ano correto a partir do ID do manifesto (ex: MAO-26... → 2026)
function getCorrectYear(manifestId) {
  const match = manifestId.match(/MAO-(\d{2})/);
  if (match) return 2000 + parseInt(match[1], 10);
  return new Date().getFullYear();
}

// Tenta parsear qualquer formato de data e retorna um objeto Date ou null
function parseAnyDate(dateStr) {
  if (!dateStr || dateStr === '---' || dateStr === '') return null;

  // Formato BR com vírgula: DD/MM/YYYY, HH:MM:SS (registros antigos do toLocaleString)
  const brCommaMatch = dateStr.match(/^(\d{2})\/(\d{2})\/(\d{4}),?\s+(\d{2}):(\d{2})(?::(\d{2}))?/);
  if (brCommaMatch) {
    const [, d, m, y, h, min, s = '00'] = brCommaMatch;
    const dt = new Date(Number(y), Number(m) - 1, Number(d), Number(h), Number(min), Number(s));
    return isNaN(dt.getTime()) ? null : { date: dt, format: 'BR', original: dateStr };
  }

  // Formato ISO sem segundos: YYYY-MM-DDTHH:MM
  const isoShortMatch = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/);
  if (isoShortMatch) {
    const [, y, m, d, h, min] = isoShortMatch;
    const dt = new Date(Number(y), Number(m) - 1, Number(d), Number(h), Number(min), 0);
    return isNaN(dt.getTime()) ? null : { date: dt, format: 'ISO', original: dateStr };
  }

  // Formato ISO completo com possível fuso horário inválido: YYYY-MM-DDTHH:MM:SS...
  const isoMatch = dateStr.match(/^(\d{1,4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})/);
  if (isoMatch) {
    const [, y, m, d, h, min, s] = isoMatch;
    // Tenta parse padrão primeiro
    const direct = new Date(dateStr);
    if (!isNaN(direct.getTime())) {
      return { date: direct, format: 'ISO', original: dateStr };
    }
    // Parse manual ignorando fuso ruim (ex: -04:00:04)
    const dt = new Date(Number(y), Number(m) - 1, Number(d), Number(h), Number(min), Number(s));
    return isNaN(dt.getTime()) ? null : { date: dt, format: 'ISO_CORROMPIDO', original: dateStr };
  }

  return { date: null, format: 'DESCONHECIDO', original: dateStr };
}

// Verifica se uma data parseada tem problemas
function detectProblems(parsed, correctYear) {
  if (!parsed) return null;
  const { date, format, original } = parsed;

  if (format === 'DESCONHECIDO') {
    return { tipo: 'FORMATO_DESCONHECIDO', descricao: `Formato não reconhecido: "${original}"` };
  }
  if (!date) {
    return { tipo: 'DATA_INVALIDA', descricao: `Data inválida: "${original}"` };
  }

  const ano = date.getFullYear();
  const mes = date.getMonth() + 1;
  const dia = date.getDate();
  const hora = date.getHours();
  const min = date.getMinutes();

  if (ano < 2020 || ano > 2030) {
    return { tipo: 'ANO_INVALIDO', descricao: `Ano fora do esperado (${ano}): "${original}"` };
  }
  if (mes < 1 || mes > 12) {
    return { tipo: 'MES_INVALIDO', descricao: `Mês inválido (${mes}): "${original}"` };
  }
  if (dia < 1 || dia > 31) {
    return { tipo: 'DIA_INVALIDO', descricao: `Dia inválido (${dia}): "${original}"` };
  }
  if (hora > 23 || min > 59) {
    return { tipo: 'HORA_INVALIDA', descricao: `Hora inválida (${hora}:${min}): "${original}"` };
  }
  if (format === 'ISO_CORROMPIDO') {
    return { tipo: 'FUSO_INVALIDO', descricao: `Fuso horário inválido no ISO: "${original}"` };
  }

  return null; // tudo OK
}

// Gera a data corrigida em formato ISO sem fuso (aceito pelo Postgres)
function gerarCorrecao(parsed, correctYear) {
  if (!parsed || !parsed.date) return null;
  const d = parsed.date;

  const ano = d.getFullYear() < 2020 || d.getFullYear() > 2030 ? correctYear : d.getFullYear();
  const mes = String(d.getMonth() + 1).padStart(2, '0');
  const dia = String(d.getDate()).padStart(2, '0');
  const h = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  const s = String(d.getSeconds()).padStart(2, '0');

  return `${ano}-${mes}-${dia}T${h}:${min}:${s}`;
}

async function run() {
  console.log('\n=== VARREDURA DE DATAS CORROMPIDAS ===\n');
  console.log('Buscando todos os registros em SMO_Sistema...');

  const { data, error } = await supabase
    .from('SMO_Sistema')
    .select('ID_Manifesto, Manifesto_Puxado, Manifesto_Recebido, Manifesto_Iniciado, Manifesto_Completo, Manifesto_Entregue')
    .order('id', { ascending: false });

  if (error) {
    console.error('ERRO ao buscar registros:', error.message);
    process.exit(1);
  }

  console.log(`Total de registros encontrados: ${data.length}\n`);

  const campos = [
    { campo: 'Manifesto_Puxado',   chave: 'Manifesto_Puxado' },
    { campo: 'Manifesto_Recebido', chave: 'Manifesto_Recebido' },
    { campo: 'Manifesto_Iniciado', chave: 'Manifesto_Iniciado' },
    { campo: 'Manifesto_Completo', chave: 'Manifesto_Completo' },
    { campo: 'Manifesto_Entregue', chave: 'Manifesto_Entregue' },
  ];

  const correcoes = [];
  const avisos = [];

  for (const record of data) {
    const correctYear = getCorrectYear(record.ID_Manifesto);
    for (const { campo, chave } of campos) {
      const valorOriginal = record[chave];
      if (!valorOriginal) continue;
      const parsed = parseAnyDate(valorOriginal);
      const problema = detectProblems(parsed, correctYear);
      if (problema) {
        const corrigido = gerarCorrecao(parsed, correctYear);
        if (corrigido) {
          correcoes.push({
            id: record.ID_Manifesto,
            campo,
            original: valorOriginal,
            corrigido,
            tipo: problema.tipo,
            descricao: problema.descricao,
          });
        } else {
          avisos.push({ id: record.ID_Manifesto, campo, descricao: problema.descricao });
        }
      }
    }
  }

  if (avisos.length > 0) {
    console.log(`\n⚠ ${avisos.length} registro(s) com problema sem correção automática:`);
    avisos.forEach(a => console.log(`  [${a.id}] ${a.campo}: ${a.descricao}`));
  }

  if (correcoes.length === 0) {
    console.log('Nenhuma data corrompida encontrada. Banco de dados OK.\n');
    process.exit(0);
  }

  console.log(`Encontradas ${correcoes.length} data(s) com problema:\n`);
  correcoes.forEach(c => {
    console.log(`  [${c.id}] ${c.campo} — ${c.tipo}`);
    console.log(`    ANTES:  ${c.original}`);
    console.log(`    DEPOIS: ${c.corrigido}\n`);
  });

  console.log('Aplicando correções...\n');

  let sucesso = 0;
  let falha = 0;

  for (const c of correcoes) {
    const { error: updateError } = await supabase
      .from('SMO_Sistema')
      .update({ [c.campo]: c.corrigido })
      .eq('ID_Manifesto', c.id);

    if (updateError) {
      console.error(`  FALHA [${c.id}] ${c.campo}: ${updateError.message}`);
      falha++;
    } else {
      console.log(`  OK [${c.id}] ${c.campo} corrigido`);
      sucesso++;
    }
  }

  console.log(`\n=== CONCLUÍDO: ${sucesso} corrigidos, ${falha} falhas ===\n`);
}

run();
