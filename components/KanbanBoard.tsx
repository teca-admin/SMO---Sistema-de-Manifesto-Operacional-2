
import React, { useState, useEffect } from 'react';
import { Manifesto } from '../types';
import { Box, Play, CheckCircle2, UserCheck, Clock, Activity, Timer, AlertTriangle, ShieldAlert, Share2, Copy, Check } from 'lucide-react';

interface KanbanBoardProps {
  manifestos: Manifesto[];
  isExternalView?: boolean;
  isAdmin?: boolean;
}

export const KanbanBoard: React.FC<KanbanBoardProps> = ({ manifestos, isExternalView = false, isAdmin = false }) => {
  const [, setTick] = useState(0);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      setTick(t => t + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const columns = [
    {
      id: 'recebido',
      title: 'Recebido',
      icon: <Box size={16} className="text-blue-500" />,
      items: manifestos.filter(m => m.status === 'Manifesto Recebido' && !m.usuarioResponsavel),
      color: 'border-blue-500',
      bgColor: 'bg-blue-50/30 dark:bg-blue-900/10'
    },
    {
      id: 'iniciado',
      title: 'Iniciado',
      icon: <Play size={16} className="text-amber-500" />,
      items: manifestos.filter(m => m.status === 'Manifesto Iniciado' || (m.status === 'Manifesto Recebido' && m.usuarioResponsavel)),
      color: 'border-amber-500',
      bgColor: 'bg-amber-50/30 dark:bg-amber-900/10'
    },
    {
      id: 'finalizado',
      title: 'Finalizado',
      icon: <CheckCircle2 size={16} className="text-emerald-500" />,
      items: manifestos.filter(m => 
        m.status === 'Manifesto Finalizado' && 
        (!m.dataHoraRepresentanteCIA || m.dataHoraRepresentanteCIA === '---' || m.dataHoraRepresentanteCIA === '')
      ),
      color: 'border-emerald-500',
      bgColor: 'bg-emerald-50/30 dark:bg-emerald-900/10'
    },
    {
      id: 'assinatura',
      title: 'Assinatura',
      icon: <UserCheck size={16} className="text-indigo-500" />,
      items: manifestos.filter(m => 
        m.status === 'Manifesto Finalizado' && 
        (m.dataHoraRepresentanteCIA && m.dataHoraRepresentanteCIA !== '---' && m.dataHoraRepresentanteCIA !== '')
      ),
      color: 'border-indigo-500',
      bgColor: 'bg-indigo-50/30 dark:bg-indigo-900/10'
    }
  ];

  const handleCopyLink = () => {
    const url = new URL(window.location.href);
    url.searchParams.set('view', 'fluxo');
    navigator.clipboard.writeText(url.toString());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const parseBRDate = (brStr: string | undefined): Date | null => {
    if (!brStr || brStr === '---' || brStr === '') return null;
    try {
      const parts = brStr.split(/[\/\s,:]+/);
      if (parts.length < 5) return null;
      const day = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const year = parseInt(parts[2], 10);
      const hour = parseInt(parts[3], 10);
      const minute = parseInt(parts[4], 10);
      return new Date(year, month, day, hour, minute);
    } catch { return null; }
  };

  const getSLAInfo = (m: Manifesto, colId: string) => {
    const startDate = parseBRDate(m.carimboDataHR);
    if (!startDate) return { status: 'normal', label: '', diffMin: 0 };
    const now = new Date();
    const diffMin = (now.getTime() - startDate.getTime()) / (1000 * 60);

    if (colId === 'recebido') {
      if (diffMin >= 60) return { status: 'warning', label: 'PONTO DE ATENÇÃO', diffMin };
    } 
    else if (colId === 'iniciado') {
      if (diffMin >= 120) return { status: 'critical', label: 'SLA VENCIDO', diffMin };
      if (diffMin >= 90) return { status: 'warning', label: 'SLA PRÓX. VENCER', diffMin };
    }
    else if (colId === 'finalizado') {
      if (diffMin >= 15) return { status: 'critical', label: 'SLA VENCIDO', diffMin };
      if (diffMin >= 10) return { status: 'warning', label: 'SLA PRÓX. VENCER', diffMin };
    }
    return { status: 'normal', label: '', diffMin };
  };

  const getElapsedTime = (lastUpdateStr: string | undefined) => {
    const startDate = parseBRDate(lastUpdateStr);
    if (!startDate) return '00:00:00';
    const now = new Date();
    const diff = Math.max(0, now.getTime() - startDate.getTime());
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);
    return [hours, minutes, seconds].map(v => String(v).padStart(2, '0')).join(':');
  };

  const getTimeOnly = (isoStr: string | undefined) => {
    if (!isoStr || isoStr === '---' || isoStr === '') return '--:--';
    const d = parseBRDate(isoStr);
    if (!d) return '--:--';
    return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className={`flex flex-col gap-4 animate-fadeIn ${isExternalView ? 'h-screen' : 'h-[calc(100vh-120px)]'} overflow-hidden`}>
      <div className="bg-[#0f172a] dark:bg-[#020617] border-2 border-slate-800 dark:border-slate-900 p-4 flex items-center justify-between shadow-lg shrink-0 rounded-sm">
        <div className="flex items-center gap-4">
          <div className="p-2 bg-indigo-600 rounded">
            <Activity size={20} className="text-white" />
          </div>
          <div>
            <h2 className="text-[14px] font-black text-white uppercase tracking-[0.2em]">
              {isExternalView ? 'Visualização Externa - Monitor de Fluxo' : 'Painel de Controle de Fluxo'}
            </h2>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
              {isExternalView ? 'Acesso Restrito ao Fluxo Operacional' : 'Monitoramento unificado em tempo real'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4">
           {isAdmin && !isExternalView && (
             <button 
                onClick={handleCopyLink}
                className="flex items-center gap-2 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-black uppercase tracking-widest transition-all rounded"
             >
                {copied ? <Check size={12} /> : <Share2 size={12} />}
                {copied ? 'Link Copiado!' : 'Gerar Link Externo'}
             </button>
           )}
           <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-800 border border-slate-700">
              <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Live Sync</span>
           </div>
        </div>
      </div>

      <div className="flex-1 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 overflow-hidden">
        {columns.map(col => (
          <div key={col.id} className={`flex flex-col border-t-4 ${col.color} bg-white dark:bg-slate-800 panel-shadow overflow-hidden`}>
            <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between bg-white dark:bg-slate-800 shrink-0">
              <div className="flex items-center gap-2">
                {col.icon}
                <h3 className="text-[12px] font-black text-slate-700 dark:text-slate-300 uppercase tracking-tighter">{col.title}</h3>
              </div>
              <span className="text-[11px] font-black bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 px-2 py-0.5 rounded-full">{col.items.length}</span>
            </div>

            <div className={`flex-1 overflow-y-auto p-3 space-y-3 custom-scrollbar ${col.bgColor}`}>
              {col.items.length === 0 ? (
                <div className="h-full flex items-center justify-center opacity-10 grayscale dark:opacity-5">
                   <Box size={40} className="text-slate-300" />
                </div>
              ) : (
                col.items.map(m => {
                  const sla = getSLAInfo(m, col.id);
                  const barColor = sla.status === 'critical' ? 'bg-red-600' : sla.status === 'warning' ? 'bg-amber-500' : 'bg-slate-900 dark:bg-indigo-600';
                  return (
                    <div key={m.id} className={`bg-white dark:bg-slate-800 border p-3 shadow-sm hover:shadow-md transition-all group ${sla.status === 'critical' ? 'border-red-400' : sla.status === 'warning' ? 'border-amber-400' : 'border-slate-200 dark:border-slate-700'}`}>
                      <div className={`mb-2.5 px-2 py-1.5 rounded-sm flex items-center justify-between transition-colors ${barColor}`}>
                         <div className="flex items-center gap-1.5">
                            {sla.status === 'critical' ? <ShieldAlert size={11} className="text-white" /> : <Timer size={11} className="text-white" />}
                            <span className="text-[9px] font-black uppercase tracking-widest text-white">{sla.label || 'Tempo em Status'}</span>
                         </div>
                         <span className="text-[11px] font-bold font-mono-tech text-white tracking-widest">{getElapsedTime(m.carimboDataHR)}</span>
                      </div>
                      <div className="flex justify-between items-center mb-3">
                        <span className="text-[13px] font-black text-slate-900 dark:text-white font-mono-tech tracking-tighter">{m.id}</span>
                        <span className={`text-[10px] font-black px-1.5 py-0.5 rounded uppercase ${m.cia === 'LATAM' ? 'bg-indigo-50 text-indigo-600 border border-indigo-100 dark:bg-indigo-900/20 dark:text-indigo-400 dark:border-indigo-800/50' : m.cia === 'AZUL' ? 'bg-blue-50 text-blue-600 border border-blue-100 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800/50' : 'bg-slate-50 text-slate-600 border border-slate-100 dark:bg-slate-700 dark:text-slate-300 dark:border-slate-600'}`}>{m.cia}</span>
                      </div>
                      <div className="grid grid-cols-2 gap-3 mb-3 px-1">
                        <div className="flex flex-col">
                           <span className="text-[9px] font-bold text-slate-400 uppercase">Turno</span>
                           <span className="text-[10px] font-black text-slate-600 dark:text-slate-300 uppercase italic truncate">{m.turno}</span>
                        </div>
                        <div className="flex flex-col text-right">
                           <span className="text-[9px] font-bold text-slate-400 uppercase">Início Log</span>
                           <span className="text-[10px] font-bold font-mono text-slate-500 dark:text-slate-400">{getTimeOnly(m.dataHoraPuxado)}</span>
                        </div>
                      </div>
                      <div className="pt-2.5 border-t border-slate-100 dark:border-slate-700 flex items-center justify-between">
                         <div className="flex items-center gap-2 max-w-[70%]">
                            <div className="w-5 h-5 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-full flex items-center justify-center text-[10px] font-black text-slate-500 shrink-0">{m.usuarioResponsavel ? m.usuarioResponsavel.charAt(0) : '?'}</div>
                            <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase truncate">{m.usuarioResponsavel || 'Vago'}</span>
                         </div>
                         <div className={`flex items-center gap-1 text-[11px] font-black shrink-0 ${sla.status === 'critical' ? 'text-red-600' : 'text-indigo-500 dark:text-indigo-400'}`}>
                            {sla.status === 'critical' && <AlertTriangle size={12} className="animate-pulse" />}
                            <span className="font-mono-tech">{getTimeOnly(m.carimboDataHR)}</span>
                         </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        ))}
      </div>
      {isExternalView && (
        <div className="py-2 text-center border-t border-slate-200 dark:border-slate-900 bg-white dark:bg-black/20">
           <p className="text-[8px] font-black uppercase tracking-[0.5em] text-slate-400">SMO Unified Flow Monitoring - WFS Terminal</p>
        </div>
      )}
    </div>
  );
};
