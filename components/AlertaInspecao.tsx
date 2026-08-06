import React, { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../supabaseClient';
import { User } from '../types';
import { AlertOctagon, ShieldCheck, Loader2, LogIn } from 'lucide-react';

// =============================================================================
// ALERTA DE INSPEÇÃO RAIO-X — ÚLTIMA LINHA DE DEFESA DA EXPEDIÇÃO
// =============================================================================
// Carga puxada para expedição que ainda não passou pelo raio-x (nem tem
// justificativa) não pode ser entregue. Este modal é bloqueante de propósito:
// só sai da tela quando o operador logado confirmar que viu — e fica
// registrado quem foi.
//
// REGRA DE OURO: este componente NUNCA pode derrubar o SMO. Se o banco estiver
// fora, a tabela não existir ou a consulta falhar, ele simplesmente não aparece.
// Um alerta quebrado não pode virar uma pane maior do que a que ele denuncia.
//
// SEM ROLAGEM: o alerta precisa caber inteiro na tela, sempre. Por isso a lista
// mostra no máximo MAX_VISIVEIS presenças e resume o restante em uma linha.
// =============================================================================

/** De quanto em quanto tempo consulta o banco. Igual ao polling do App.tsx. */
const POLL_INTERVAL_MS = 60_000;

/**
 * Quanto tempo uma confirmação silencia o alerta.
 * Passado esse prazo, se a carga continuar sem inspeção, o modal volta —
 * e gera um novo registro de quem viu.
 *
 * IMPORTANTE: precisa acompanhar a cadência do robô, que roda 1x por hora
 * (no minuto :50). Se este valor fosse menor, o alerta voltaria com dados
 * da rodada anterior e poderia cobrar carga que já foi inspecionada nesse
 * meio-tempo — alerta falso destrói a credibilidade do aviso.
 * Se mudar a cadência do robô, mude aqui junto.
 */
const MINUTOS_ATE_REALERTA = 60;

/** Quantas presenças aparecem na lista antes de virar "+N outras". */
const MAX_VISIVEIS = 6;

/** Cor de fundo sólida, aplicada inline para não depender de classe do Tailwind. */
const FUNDO = '#3f0708';

interface AlertaInspecaoRow {
  id: number;
  presenca: string;
  tipo_internacao: string | null;
  internador: string | null;
  hora_puxe: string | null;
  motivo: string;
  status: string;
  detectado_em: string;
  confirmado_por: string | null;
  confirmado_em: string | null;
  confirmacoes: number;
}

interface AlertaInspecaoProps {
  activeUser: User | null;
}

/**
 * MODO DEMONSTRAÇÃO — acesse com ?alerta-demo=1 na URL.
 * Mostra o alerta com dados fictícios, sem ler nem escrever no banco.
 * Serve para validar o visual e para treinar a equipe. Sem esse parâmetro
 * o componente ignora completamente este bloco.
 */
const MODO_DEMO =
  typeof window !== 'undefined' &&
  new URLSearchParams(window.location.search).get('alerta-demo') === '1';

const DADOS_DEMO: AlertaInspecaoRow[] = [
  {
    id: -1, presenca: '26007554600', tipo_internacao: 'NORMAL',
    internador: 'CLEBSON RAIMUNDO DOS SANTOS', hora_puxe: '09:12',
    motivo: 'SEM_INSPECAO', status: 'ABERTO',
    detectado_em: new Date(Date.now() - 74 * 60_000).toISOString(),
    confirmado_por: null, confirmado_em: null, confirmacoes: 2
  },
  {
    id: -2, presenca: '26007248400', tipo_internacao: 'LIB AUTOMA',
    internador: 'AMAZON PEIXES COMERCIO LTDA', hora_puxe: '09:41',
    motivo: 'ISENTA_SEM_JUSTIFICATIVA', status: 'ABERTO',
    detectado_em: new Date(Date.now() - 22 * 60_000).toISOString(),
    confirmado_por: null, confirmado_em: null, confirmacoes: 0
  },
  {
    id: -3, presenca: '26006927900', tipo_internacao: 'DST',
    internador: 'J.A.LOUREIRO IMPORTACAO', hora_puxe: '10:03',
    motivo: 'SEM_INSPECAO', status: 'ABERTO',
    detectado_em: new Date(Date.now() - 6 * 60_000).toISOString(),
    confirmado_por: null, confirmado_em: null, confirmacoes: 0
  }
];

/** Timestamp no formato que o resto do sistema usa (DD/MM/AAAA HH:MM:SS). */
const agoraBR = () => {
  const d = new Date();
  return `${d.toLocaleDateString('pt-BR')} ${d.toLocaleTimeString('pt-BR', {
    hour: '2-digit', minute: '2-digit', second: '2-digit'
  })}`;
};

/** "1h14" — tempo que a carga está parada esperando inspeção. */
const tempoDecorrido = (iso: string): string => {
  const inicio = new Date(iso).getTime();
  if (isNaN(inicio)) return '';
  const min = Math.floor((Date.now() - inicio) / 60000);
  if (min < 1) return 'agora';
  if (min < 60) return `${min}min`;
  const h = Math.floor(min / 60);
  const resto = min % 60;
  return resto ? `${h}h${String(resto).padStart(2, '0')}` : `${h}h`;
};

const AlertaInspecaoInterno: React.FC<AlertaInspecaoProps> = ({ activeUser }) => {
  const [alertas, setAlertas] = useState<AlertaInspecaoRow[]>([]);
  const [confirmando, setConfirmando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  // Quando não há ninguém logado, o operador precisa conseguir chegar na tela
  // de login — que fica atrás deste modal. Esta liberação temporária evita o
  // beco sem saída, e o alerta volta sozinho no próximo ciclo.
  const [liberadoParaLogin, setLiberadoParaLogin] = useState(false);

  const buscandoRef = useRef(false);

  const carregarAlertas = useCallback(async () => {
    if (MODO_DEMO) { setAlertas(DADOS_DEMO); return; }
    if (buscandoRef.current) return;
    buscandoRef.current = true;
    try {
      const limite = new Date(Date.now() - MINUTOS_ATE_REALERTA * 60_000).toISOString();

      // Aparece quando: nunca foi visto (ABERTO) OU foi confirmado há mais de
      // MINUTOS_ATE_REALERTA e a carga continua pendente.
      const { data, error } = await supabase
        .from('Alertas_Inspecao')
        .select('*')
        .neq('status', 'RESOLVIDO')
        .or(`status.eq.ABERTO,and(status.eq.CONFIRMADO,confirmado_em.lt.${limite})`)
        .order('detectado_em', { ascending: true })
        .limit(200);

      if (error) {
        // Falha silenciosa de propósito (ver REGRA DE OURO no topo).
        console.warn('[AlertaInspecao] consulta falhou, alerta oculto nesta rodada:', error.message);
        setAlertas([]);
        return;
      }
      setAlertas(data ?? []);
    } catch (e: any) {
      console.warn('[AlertaInspecao] erro inesperado, alerta oculto:', e?.message);
      setAlertas([]);
    } finally {
      buscandoRef.current = false;
    }
  }, []);

  useEffect(() => {
    carregarAlertas();
    const t = setInterval(carregarAlertas, POLL_INTERVAL_MS);
    return () => clearInterval(t);
  }, [carregarAlertas]);

  // Assim que alguém loga, a liberação temporária se encerra e o alerta volta.
  useEffect(() => {
    if (activeUser?.Nome_Completo) setLiberadoParaLogin(false);
  }, [activeUser?.Nome_Completo]);

  const visivel = alertas.length > 0 && !liberadoParaLogin;

  // Trava a rolagem do fundo e bloqueia ESC enquanto o alerta estiver na tela.
  useEffect(() => {
    if (!visivel) return;
    const overflowAnterior = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const bloqueiaEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); }
    };
    window.addEventListener('keydown', bloqueiaEsc, true);
    return () => {
      document.body.style.overflow = overflowAnterior;
      window.removeEventListener('keydown', bloqueiaEsc, true);
    };
  }, [visivel]);

  if (!visivel) return null;

  const operador = activeUser?.Nome_Completo ?? null;

  const confirmar = async () => {
    if (!operador) return;
    setErro(null);
    setConfirmando(true);
    try {
      // Na demonstração nada é gravado: apenas fecha, para mostrar o efeito.
      if (MODO_DEMO) {
        await new Promise(r => setTimeout(r, 600));
        setAlertas([]);
        return;
      }

      const agoraIso = new Date().toISOString();
      const carimboBR = agoraBR();

      // 1) Marca os alertas como confirmados, registrando quem viu e somando 1
      //    ao contador de avisos (é o "Avisado Nx" que aparece na linha).
      //    O PostgREST não faz "coluna = coluna + 1", então agrupamos as cargas
      //    que estão no mesmo contador e mandamos um update por grupo — na
      //    prática são 1 ou 2 chamadas, não uma por carga.
      const porContador = new Map<number, number[]>();
      for (const a of alertas) {
        const atual = a.confirmacoes ?? 0;
        if (!porContador.has(atual)) porContador.set(atual, []);
        porContador.get(atual)!.push(a.id);
      }

      for (const [contadorAtual, ids] of porContador) {
        const { error: erroUpdate } = await supabase
          .from('Alertas_Inspecao')
          .update({
            status: 'CONFIRMADO',
            confirmado_por: operador,
            confirmado_em: agoraIso,
            atualizado_em: agoraIso,
            confirmacoes: contadorAtual + 1
          })
          .in('id', ids);

        if (erroUpdate) throw erroUpdate;
      }

      // 2) Grava a prova de auditoria — uma linha por presença, nunca sofre
      //    update. É o histórico de quem viu o quê, para consulta posterior.
      const registros = alertas.map(a => ({
        alerta_id: a.id,
        presenca: a.presenca,
        usuario: operador,
        acao: 'CONFIRMADO',
        qtd_no_lote: alertas.length,
        criado_em_br: carimboBR
      }));
      const { error: erroLog } = await supabase.from('Alertas_Inspecao_Log').insert(registros);
      if (erroLog) {
        // O log importa, mas não pode impedir a operação de seguir:
        // o alerta já foi confirmado no passo 1.
        console.error('[AlertaInspecao] falha ao gravar log de auditoria:', erroLog.message);
      }

      setAlertas([]);
    } catch (e: any) {
      setErro(e?.message || 'Falha ao confirmar. Tente novamente.');
    } finally {
      setConfirmando(false);
    }
  };

  const total = alertas.length;
  const visiveis = alertas.slice(0, MAX_VISIVEIS);
  const ocultas = total - visiveis.length;

  return (
    <div
      className="fixed inset-0 z-[10050] flex flex-col overflow-hidden animate-fadeIn"
      style={{ backgroundColor: FUNDO }}
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="titulo-alerta-inspecao"
    >
      {/* Faixa superior pulsante — impossível confundir com um aviso comum */}
      <div className="shrink-0 h-1.5 w-full bg-red-500 animate-pulse" />

      <div className="flex-1 min-h-0 flex flex-col px-4 py-3 sm:px-8 sm:py-5">
        <div className="w-full max-w-6xl mx-auto flex-1 min-h-0 flex flex-col gap-3 sm:gap-4">

          {/* CABEÇALHO — horizontal e compacto para sobrar espaço à lista */}
          <div className="shrink-0 flex items-center gap-4 sm:gap-5">
            <div className="shrink-0 w-14 h-14 sm:w-16 sm:h-16 bg-red-600 flex items-center justify-center">
              <AlertOctagon size={38} className="text-white" strokeWidth={2.5} />
            </div>
            <div className="min-w-0">
              <h1
                id="titulo-alerta-inspecao"
                className="text-2xl sm:text-4xl font-black text-white uppercase tracking-tight leading-none"
              >
                Carga puxada sem inspeção
              </h1>
              <p className="text-[11px] sm:text-sm font-bold text-red-300 uppercase tracking-widest mt-1.5">
                {total === 1 ? '1 presença não pode ser entregue' : `${total} presenças não podem ser entregues`}
                {' '}sem imagem de raio-x ou justificativa
              </p>
            </div>
          </div>

          {/* LISTA — ocupa o espaço restante, sem rolagem */}
          <div className="flex-1 min-h-0 flex flex-col border-2 border-red-500/50 bg-black/50">
            <div className="shrink-0 bg-red-600 px-4 py-2 flex items-center justify-between">
              <span className="text-[10px] sm:text-[11px] font-black text-white uppercase tracking-widest">
                Presenças pendentes de inspeção
              </span>
              <span className="text-[11px] font-black text-white bg-red-900 px-2.5 py-0.5">{total}</span>
            </div>

            {/* justify-center: com poucas cargas as linhas ficam com altura
                natural e o bloco fica centralizado, em vez de uma unica linha
                esticada ocupando a caixa inteira. */}
            <div className="flex-1 min-h-0 flex flex-col justify-center divide-y divide-red-500/25">
              {visiveis.map(a => (
                <div key={a.id} className="shrink-0 py-3 sm:py-4 flex items-center px-3 sm:px-5">
                  <div className="w-full flex items-center gap-3 sm:gap-6">

                    {/* Número da presença — o dado principal */}
                    <p className="font-mono-tech text-xl sm:text-3xl font-bold text-white tracking-wider leading-none shrink-0">
                      {a.presenca}
                    </p>

                    <span className="shrink-0 text-[10px] sm:text-xs font-black text-white bg-red-700 px-2 py-1 uppercase tracking-wide">
                      {a.tipo_internacao || '---'}
                    </span>

                    <p className="flex-1 min-w-0 text-[11px] sm:text-sm font-bold text-red-100 truncate">
                      {a.internador || '---'}
                    </p>

                    <span className="hidden sm:block shrink-0 text-xs font-bold text-red-200 tabular-nums">
                      puxada {a.hora_puxe || '--:--'}
                    </span>

                    {a.motivo === 'ISENTA_SEM_JUSTIFICATIVA' && (
                      <span className="hidden lg:block shrink-0 text-[9px] font-black text-amber-200 bg-amber-900/70 border border-amber-500/50 px-2 py-0.5 uppercase whitespace-nowrap">
                        Isenta sem justificativa
                      </span>
                    )}

                    {a.confirmacoes > 0 && (
                      <span className="hidden lg:block shrink-0 text-[9px] font-black text-red-100 bg-red-800 border border-red-400/50 px-2 py-0.5 uppercase whitespace-nowrap">
                        Avisado {a.confirmacoes}x
                      </span>
                    )}

                    {/* Há quanto tempo está parada */}
                    <span className="shrink-0 w-14 sm:w-20 text-right text-sm sm:text-xl font-black text-white tabular-nums leading-none">
                      {tempoDecorrido(a.detectado_em)}
                    </span>
                  </div>
                </div>
              ))}

              {ocultas > 0 && (
                <div className="shrink-0 px-3 sm:px-5 py-2 bg-red-900/40">
                  <p className="text-[11px] sm:text-xs font-black text-red-200 uppercase tracking-widest text-center">
                    + {ocultas} outra{ocultas > 1 ? 's' : ''} presença{ocultas > 1 ? 's' : ''} pendente{ocultas > 1 ? 's' : ''}
                  </p>
                </div>
              )}
            </div>
          </div>

          {erro && (
            <div className="shrink-0 bg-red-600 px-4 py-2">
              <p className="text-xs font-black text-white uppercase tracking-wide">{erro}</p>
            </div>
          )}

          {/* AÇÃO */}
          <div className="shrink-0">
            {operador ? (
              <>
                <button
                  onClick={confirmar}
                  disabled={confirmando}
                  className="w-full h-16 sm:h-20 bg-white hover:bg-red-50 disabled:bg-slate-500 disabled:cursor-wait text-red-800 text-base sm:text-2xl font-black uppercase tracking-widest transition-colors flex items-center justify-center gap-3"
                >
                  {confirmando ? (
                    <><Loader2 size={28} className="animate-spin" /> Registrando...</>
                  ) : (
                    <><ShieldCheck size={28} strokeWidth={2.5} /> Confirmo que vi — {operador}</>
                  )}
                </button>
                <p className="text-[9px] sm:text-[10px] font-bold text-red-300 uppercase tracking-widest text-center mt-2">
                  Sua confirmação fica registrada · reaparece em {MINUTOS_ATE_REALERTA} min se continuar pendente
                </p>
              </>
            ) : (
              <>
                <button
                  onClick={() => setLiberadoParaLogin(true)}
                  className="w-full h-16 sm:h-20 bg-white hover:bg-red-50 text-red-800 text-base sm:text-2xl font-black uppercase tracking-widest transition-colors flex items-center justify-center gap-3"
                >
                  <LogIn size={28} strokeWidth={2.5} /> Fazer login para confirmar
                </button>
                <p className="text-[9px] sm:text-[10px] font-bold text-red-300 uppercase tracking-widest text-center mt-2">
                  É preciso estar logado para registrar quem tomou ciência
                </p>
              </>
            )}
          </div>

        </div>
      </div>

      <div className="shrink-0 h-1.5 w-full bg-red-500 animate-pulse" />
    </div>
  );
};

// =============================================================================
// BLINDAGEM CONTRA FALHA
// =============================================================================
// No React, uma excecao durante o render derruba a ARVORE INTEIRA: o SMO viraria
// tela branca. Como este componente e um acrescimo a um sistema que ja esta em
// producao, ele nao pode, em hipotese nenhuma, tirar a expedicao do ar.
//
// O try/catch das consultas cobre erro de rede/banco, mas NAO cobre erro de
// renderizacao (um campo inesperado vindo do banco, por exemplo). Este limite
// de erro cobre esse caso: se algo quebrar aqui dentro, o alerta simplesmente
// some e o resto do sistema continua funcionando normalmente.
//
// Preferimos perder o alerta a derrubar o sistema que ele existe para proteger.
// =============================================================================
class LimiteDeErro extends React.Component<
  { children: React.ReactNode },
  { falhou: boolean }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { falhou: false };
  }

  static getDerivedStateFromError() {
    return { falhou: true };
  }

  componentDidCatch(erro: Error, info: React.ErrorInfo) {
    // Fica no console para diagnostico, sem incomodar quem esta operando.
    console.error('[AlertaInspecao] falhou e foi isolado do restante do sistema:', erro, info);
  }

  render() {
    if (this.state.falhou) return null;
    return this.props.children;
  }
}

export const AlertaInspecao: React.FC<AlertaInspecaoProps> = (props) => (
  <LimiteDeErro>
    <AlertaInspecaoInterno {...props} />
  </LimiteDeErro>
);
