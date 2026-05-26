import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://teca-admin-supabase.gf4wga.easypanel.host';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyAgCiAgICAicm9sZSI6ICJhbm9uIiwKICAgICJpc3MiOiAic3VwYWJhc2UtZGVtbyIsCiAgICAiaWF0IjogMTY0MTc2OTIwMCwKICAgICJleHAiOiAxNzk5NTM1NjAwCn0.dc_X5iR_VP_qT0zsiyj_I_OZ2T9FtRU2BBNWN8Bu4GE';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  db: { schema: 'smo' }
});

function parseData(str) {
  if (!str || str === '---' || str === '') return null;
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

function dayStr(dt) {
  if (!dt) return '??';
  return `${String(dt.getDate()).padStart(2,'0')}/${String(dt.getMonth()+1).padStart(2,'0')}/${dt.getFullYear()}`;
}

function fmt(dt) {
  if (!dt) return '---';
  const p = n => String(n).padStart(2,'0');
  return `${p(dt.getDate())}/${p(dt.getMonth()+1)}/${dt.getFullYear()} ${p(dt.getHours())}:${p(dt.getMinutes())}:${p(dt.getSeconds())}`;
}

async function run() {
  console.log('\n=== INVESTIGAÇÃO: MANIFESTO PUXADO COM DIA ANTERIOR ===\n');

  // Carrega todos os registros
  let all = [];
  let from = 0;
  const PAGE = 1000;
  while (true) {
    const { data, error } = await supabase
      .from('SMO_Sistema')
      .select('ID_Manifesto, CIA, Usuario_Sistema, Turno, Status, Manifesto_Puxado, Manifesto_Recebido, Manifesto_Iniciado, Manifesto_Completo, Representante_CIA, Manifesto_Entregue')
      .order('id', { ascending: true })
      .range(from, from + PAGE - 1);
    if (error) { console.error(error.message); process.exit(1); }
    all = all.concat(data);
    if (data.length < PAGE) break;
    from += PAGE;
  }
  console.log(`Total carregado: ${all.length} manifestos\n`);

  const casos = [];

  for (const r of all) {
    const dtPux = parseData(r.Manifesto_Puxado);
    const dtRec = parseData(r.Manifesto_Recebido);
    const dtIni = parseData(r.Manifesto_Iniciado);
    const dtFin = parseData(r.Manifesto_Completo);
    const dtAss = parseData(r.Representante_CIA);
    const dtEnt = parseData(r.Manifesto_Entregue);

    if (!dtPux) continue;

    // Coleta todas as outras datas disponíveis
    const outras = [dtRec, dtIni, dtFin, dtAss, dtEnt].filter(Boolean);
    if (outras.length === 0) continue;

    // Dia do puxado (zera horário para comparar apenas datas)
    const diaPux = new Date(dtPux.getFullYear(), dtPux.getMonth(), dtPux.getDate());

    // Verifica se ALGUMA das outras datas está em um dia posterior ao puxado
    const temDiaPosterior = outras.some(dt => {
      const diaDt = new Date(dt.getFullYear(), dt.getMonth(), dt.getDate());
      return diaDt > diaPux;
    });

    if (!temDiaPosterior) continue;

    // Calcula diferença máxima de dias
    const maxDiff = Math.max(...outras.map(dt => {
      const diaDt = new Date(dt.getFullYear(), dt.getMonth(), dt.getDate());
      return (diaDt - diaPux) / 86400000;
    }));

    casos.push({
      id: r.ID_Manifesto,
      cia: r.CIA,
      status: r.Status,
      turno: r.Turno,
      usuario: r.Usuario_Sistema,
      puxado:   fmt(dtPux),
      recebido: fmt(dtRec),
      iniciado: fmt(dtIni),
      finalizado: fmt(dtFin),
      assinatura: fmt(dtAss),
      entregue:  fmt(dtEnt),
      diffDias: maxDiff,
      diaPux: dayStr(diaPux),
    });
  }

  if (casos.length === 0) {
    console.log('Nenhum caso encontrado.\n');
    process.exit(0);
  }

  // Ordena por diferença de dias (maior primeiro) e depois por ID
  casos.sort((a, b) => b.diffDias - a.diffDias || a.id.localeCompare(b.id));

  console.log(`Encontrados ${casos.length} manifestos com Puxado em dia anterior:\n`);
  console.log('─'.repeat(100));

  for (const c of casos) {
    console.log(`\n  ID: ${c.id}   CIA: ${c.cia}   Turno: ${c.turno}   Status: ${c.status}`);
    console.log(`  Cadastrado por: ${c.usuario}`);
    console.log(`  ┌ Manifesto Puxado    : ${c.puxado}  ← DIA: ${c.diaPux}`);
    if (c.recebido  !== '---') console.log(`  │ Manifesto Recebido  : ${c.recebido}`);
    if (c.iniciado  !== '---') console.log(`  │ Manifesto Iniciado  : ${c.iniciado}`);
    if (c.finalizado !== '---') console.log(`  │ Manifesto Finalizado: ${c.finalizado}`);
    if (c.assinatura !== '---') console.log(`  │ Assinatura Repr.    : ${c.assinatura}`);
    if (c.entregue  !== '---') console.log(`  └ Manifesto Entregue : ${c.entregue}`);
    console.log(`  Diferença: ${c.diffDias} dia(s)`);
  }

  console.log('\n' + '─'.repeat(100));
  console.log(`\nTotal: ${casos.length} casos\n`);

  // Exporta CSV para facilitar revisão
  const linhas = ['ID_Manifesto,CIA,Status,Turno,Puxado,Recebido,Iniciado,Finalizado,Assinatura,Entregue,Diff_Dias'];
  for (const c of casos) {
    linhas.push([c.id, c.cia, c.status, c.turno, c.puxado, c.recebido, c.iniciado, c.finalizado, c.assinatura, c.entregue, c.diffDias].join(','));
  }
  const fs = await import('fs');
  fs.writeFileSync('./scripts/puxado-mismatch.csv', linhas.join('\n'), 'utf8');
  console.log('CSV exportado: scripts/puxado-mismatch.csv\n');
}

run().catch(e => { console.error(e); process.exit(1); });
