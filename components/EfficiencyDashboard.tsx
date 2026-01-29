
import React, { useMemo, useState, useEffect } from 'react';
import { Manifesto, CIAS, User as UserType } from '../types';
import { 
  BarChart3, 
  Award, 
  Box, 
  Plane, 
  XCircle, 
  Activity,
  AlertTriangle,
  Target,
  ChevronRight,
  PieChart,
  X,
  Timer,
  ShieldCheck,
  FileSearch,
  Clock,
  MousePointer2,
  ExternalLink,
  Search
} from 'lucide-react';
import { CustomDateRangePicker } from './CustomDateRangePicker';

interface EfficiencyDashboardProps {
  manifestos: Manifesto[];
  activeUser: UserType | null;
  openHistory?: (id: string) => void;
}

interface ActiveFilters {
  cia: string | null;
  turno: string | null;
  usuario: string | null;
  usuarioCadastro: string | null;
  status: string | null;
  manifestoId: string | null;
  manifestoSearch: string;
  sistemaRankSearch: string;
  operacaoRankSearch: string;
  hora: number[]; 
  onlyViolations: boolean;
}

export const EfficiencyDashboard: React.FC<EfficiencyDashboardProps> = ({ manifestos, activeUser, openHistory }) => {
  const [dateRange, setDateRange] = useState({
    start: new Date(new Date().setHours(0, 0, 0, 0)).toISOString(),
    end: new Date(new Date().setHours(23, 59, 59, 999)).toISOString()
  });

  const [activeFilters, setActiveFilters] = useState<ActiveFilters>({
    cia: null,
    turno: null,
    usuario: null,
    usuarioCadastro: null,
    status: null,
    manifestoId: null,
    manifestoSearch: '',
    sistemaRankSearch: '',
    operacaoRankSearch: '',
    hora: [],
    onlyViolations: false
  });

  const [isCtrlPressed, setIsCtrlPressed] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Control' || e.key === 'Meta') setIsCtrlPressed(true);
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'Control' || e.key === 'Meta') setIsCtrlPressed(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  const getCiaColor = (ciaName: string) => {
    const name = ciaName.toUpperCase();
    if (name.includes('AZUL')) return '#4f46e5';
    if (name.includes('GOL')) return '#f59e0b';
    if (name.includes('LATAM')) return '#ef4444';
    if (name.includes('MODERN')) return '#3b82f6';
    if (name.includes('TOTAL')) return '#06b6d4';
    return '#6366f1';
  };

  const getTurnColor = (turn: string) => {
    if (turn === '1º TURNO') return '#3b82f6';
    if (turn === '2º TURNO') return '#f59e0b';
    if (turn === '3º TURNO') return '#10b981';
    return '#6366f1';
  };

  const parseAnyDate = (dateStr: string | undefined): Date | null => {
    if (!dateStr || dateStr === '---' || dateStr === '') return null;
    try {
      const directDate = new Date(dateStr);
      if (!isNaN(directDate.getTime())) return directDate;
      const parts = dateStr.split(/[\/\s,:]+/);
      if (parts.length >= 5) {
        const d = new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]), parseInt(parts[3]), parseInt(parts[4]));
        if (!isNaN(d.getTime())) return d;
      }
      return null;
    } catch { return null; }
  };

  const getViolationReason = (m: Manifesto) => {
    const pux = parseAnyDate(m.dataHoraPuxado);
    const rec = parseAnyDate(m.dataHoraRecebido);
    const ini = parseAnyDate(m.dataHoraIniciado);
    const com = parseAnyDate(m.dataHoraCompleto);
    const ass = parseAnyDate(m.dataHoraRepresentanteCIA);
    if (pux && rec) {
      const diff = (rec.getTime() - pux.getTime()) / 60000;
      if (diff > 10) return 'APRE. > 10M';
    }
    if (ini && com) {
      const diff = (com.getTime() - ini.getTime()) / 60000;
      if (diff > 120) return 'WFS > 2H';
    }
    if (com && ass) {
      const diff = (ass.getTime() - com.getTime()) / 60000;
      if (diff > 15) return 'COMP. > 15M';
    }
    return null;
  };

  const toggleFilter = (type: keyof ActiveFilters, value: any) => {
    if (type === 'hora') {
      setActiveFilters(prev => {
        const isAlreadySelected = prev.hora.includes(value);
        if (isCtrlPressed) {
          return {
            ...prev,
            hora: isAlreadySelected 
              ? prev.hora.filter(h => h !== value) 
              : [...prev.hora, value].sort((a, b) => a - b)
          };
        } else {
          return {
            ...prev,
            hora: isAlreadySelected && prev.hora.length === 1 ? [] : [value]
          };
        }
      });
    } else {
      setActiveFilters(prev => ({
        ...prev,
        [type]: (prev as any)[type] === value ? (type === 'onlyViolations' ? false : (type === 'manifestoSearch' || type === 'sistemaRankSearch' || type === 'operacaoRankSearch' ? '' : null)) : value
      }));
    }
  };

  const filteredManifestos = useMemo(() => {
    const start = new Date(dateRange.start);
    const end = new Date(dateRange.end);
    return manifestos.filter(m => {
      const mDate = parseAnyDate(m.dataHoraRecebido) || parseAnyDate(m.dataHoraPuxado);
      const inDateRange = mDate && mDate >= start && mDate <= end;
      if (!inDateRange) return false;
      if (activeFilters.cia && m.cia.toUpperCase() !== activeFilters.cia.toUpperCase()) return false;
      if (activeFilters.turno && m.turno !== activeFilters.turno) return false;
      if (activeFilters.usuario && m.usuarioResponsavel !== activeFilters.usuario) return false;
      if (activeFilters.usuarioCadastro && m.usuario !== activeFilters.usuarioCadastro) return false;
      if (activeFilters.manifestoId && m.id !== activeFilters.manifestoId) return false;
      if (activeFilters.onlyViolations && !getViolationReason(m)) return false;
      if (activeFilters.manifestoSearch && !m.id.toLowerCase().includes(activeFilters.manifestoSearch.toLowerCase())) return false;
      if (activeFilters.hora.length > 0) {
        const hour = mDate.getHours();
        if (!activeFilters.hora.includes(hour)) return false;
      }
      if (activeFilters.status) {
        if (activeFilters.status === 'Concluído' && m.status !== 'Manifesto Entregue') return false;
        if (activeFilters.status === 'Andamento' && (m.status === 'Manifesto Entregue' || m.status === 'Manifesto Cancelado')) return false;
        if (activeFilters.status === 'Cancelado' && m.status !== 'Manifesto Cancelado') return false;
      }
      return true;
    });
  }, [manifestos, dateRange, activeFilters]);

  const hourlyStats = useMemo(() => {
    const now = new Date();
    const start = new Date(dateRange.start);
    const end = new Date(dateRange.end);
    const isToday = start.toDateString() === now.toDateString();
    const isPastDay = end < now && start.toDateString() !== now.toDateString();
    const currentHour = now.getHours();
    const baseManifestos = manifestos.filter(m => {
      const mDate = parseAnyDate(m.dataHoraRecebido) || parseAnyDate(m.dataHoraPuxado);
      if (!mDate || mDate < start || mDate > end) return false;
      if (activeFilters.cia && m.cia.toUpperCase() !== activeFilters.cia.toUpperCase()) return false;
      if (activeFilters.turno && m.turno !== activeFilters.turno) return false;
      if (activeFilters.usuario && m.usuarioResponsavel !== activeFilters.usuario) return false;
      if (activeFilters.usuarioCadastro && m.usuario !== activeFilters.usuarioCadastro) return false;
      if (activeFilters.manifestoSearch && !m.id.toLowerCase().includes(activeFilters.manifestoSearch.toLowerCase())) return false;
      if (activeFilters.status) {
        if (activeFilters.status === 'Concluído' && m.status !== 'Manifesto Entregue') return false;
        if (activeFilters.status === 'Andamento' && (m.status === 'Manifesto Entregue' || m.status === 'Manifesto Cancelado')) return false;
        if (activeFilters.status === 'Cancelado' && m.status !== 'Manifesto Cancelado') return false;
      }
      return true;
    });
    const hours: Record<number, { received: number, isFuture: boolean }> = {};
    for (let i = 0; i < 24; i++) {
      let isFuture = isToday ? i > currentHour : !isPastDay;
      hours[i] = { received: 0, isFuture };
    }
    baseManifestos.forEach(m => {
      const dRec = parseAnyDate(m.dataHoraRecebido) || parseAnyDate(m.dataHoraPuxado);
      if (dRec) {
        const h = dRec.getHours();
        if (hours[h]) hours[h].received++;
      }
    });
    return Object.entries(hours).map(([h, data]) => ({ hour: parseInt(h), ...data }));
  }, [manifestos, dateRange, activeFilters.cia, activeFilters.turno, activeFilters.usuario, activeFilters.usuarioCadastro, activeFilters.status, activeFilters.manifestoSearch]);

  const totalReceived = filteredManifestos.length;
  const totalDelivered = filteredManifestos.filter(m => m.status === 'Manifesto Entregue').length;
  const totalCanceled = filteredManifestos.filter(m => m.status === 'Manifesto Cancelado').length;
  const totalInProgress = filteredManifestos.filter(m => m.status !== 'Manifesto Entregue' && m.status !== 'Manifesto Cancelado').length;

  const atribuicaoRank = useMemo(() => {
    const counts: Record<string, number> = {};
    filteredManifestos.forEach(m => {
      if (m.usuarioResponsavel) counts[m.usuarioResponsavel] = (counts[m.usuarioResponsavel] || 0) + 1;
    });
    let entries = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    if (activeFilters.operacaoRankSearch) {
      entries = entries.filter(([name]) => name.toLowerCase().includes(activeFilters.operacaoRankSearch.toLowerCase()));
    }
    return entries.slice(0, 10);
  }, [filteredManifestos, activeFilters.operacaoRankSearch]);

  const sistemaRank = useMemo(() => {
    const counts: Record<string, number> = {};
    filteredManifestos.forEach(m => {
      if (m.usuario) counts[m.usuario] = (counts[m.usuario] || 0) + 1;
    });
    let entries = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    if (activeFilters.sistemaRankSearch) {
      entries = entries.filter(([name]) => name.toLowerCase().includes(activeFilters.sistemaRankSearch.toLowerCase()));
    }
    return entries.slice(0, 10);
  }, [filteredManifestos, activeFilters.sistemaRankSearch]);

  const ciaStats = useMemo(() => {
    const counts: Record<string, number> = {};
    CIAS.forEach(c => counts[c.toUpperCase()] = 0);
    filteredManifestos.forEach(m => {
      const cia = m.cia.toUpperCase();
      counts[cia] = (counts[cia] || 0) + 1;
    });
    const entries = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    const total = entries.reduce((acc, curr) => acc + curr[1], 0);
    return entries.map(([cia, count]) => ({ label: cia, count, pct: total > 0 ? (count / total) * 100 : 0 }));
  }, [filteredManifestos]);

  const turnStats = useMemo(() => {
    const turns = { t1: 0, t2: 0, t3: 0 };
    filteredManifestos.forEach(m => {
      if (m.turno === '1º TURNO') turns.t1++;
      else if (m.turno === '2º TURNO') turns.t2++;
      else if (m.turno === '3º TURNO') turns.t3++;
    });
    const total = turns.t1 + turns.t2 + turns.t3;
    return [
      { label: '1º TURNO', count: turns.t1, pct: total > 0 ? (turns.t1 / total) * 100 : 0 },
      { label: '2º TURNO', count: turns.t2, pct: total > 0 ? (turns.t2 / total) * 100 : 0 },
      { label: '3º TURNO', count: turns.t3, pct: total > 0 ? (turns.t3 / total) * 100 : 0 }
    ];
  }, [filteredManifestos]);

  const slaStats = useMemo(() => {
    let tE = 0, cE = 0, maxE = 0, withinE = 0, maxE_id = "";
    let tP = 0, cP = 0, maxP = 0, withinP = 0, maxP_id = "";
    let tA = 0, cA = 0, maxA = 0, withinA = 0, maxA_id = "";
    filteredManifestos.forEach(m => {
      const pux = parseAnyDate(m.dataHoraPuxado);
      const rec = parseAnyDate(m.dataHoraRecebido);
      const ini = parseAnyDate(m.dataHoraIniciado);
      const com = parseAnyDate(m.dataHoraCompleto);
      const ass = parseAnyDate(m.dataHoraRepresentanteCIA);
      if (pux && rec) { 
        let diff = (rec.getTime() - pux.getTime()) / 60000;
        if (diff < 0) diff = 0; 
        tE += diff; cE++;
        if (diff > maxE) { maxE = diff; maxE_id = m.id; }
        if (diff <= 10) withinE++;
      }
      if (ini && com) { 
        let diff = (com.getTime() - ini.getTime()) / 60000;
        if (diff < 0) diff = 0;
        tP += diff; cP++;
        if (diff > maxP) { maxP = diff; maxP_id = m.id; }
        if (diff <= 120) withinP++; 
      }
      if (com && ass) { 
        let diff = (ass.getTime() - com.getTime()) / 60000;
        if (diff < 0) diff = 0;
        tA += diff; cA++;
        if (diff > maxA) { maxA = diff; maxA_id = m.id; }
        if (diff <= 15) withinA++; 
      }
    });
    return { 
      avgE: cE > 0 ? tE / cE : 0, maxE, maxE_id, pctE: cE > 0 ? (withinE / cE) * 100 : 0,
      avgP: cP > 0 ? tP / cP : 0, maxP, maxP_id, pctP: cP > 0 ? (withinP / cP) * 100 : 0,
      avgA: cA > 0 ? tA / cA : 0, maxA, maxA_id, pctA: cA > 0 ? (withinA / cA) * 100 : 0
    };
  }, [filteredManifestos]);

  const flowStats = useMemo(() => {
    const activeHours = hourlyStats.filter(h => !h.isFuture);
    const rawCounts = activeHours.map(h => h.received);
    if (rawCounts.length === 0) return { avg: 0, q3: 0, max: 0 };
    const max = Math.max(...rawCounts);
    const total = rawCounts.reduce((acc, curr) => acc + curr, 0);
    const avg = total / rawCounts.length;
    let q3 = 0;
    if (rawCounts.length > 0) {
      const sorted = [...rawCounts].sort((a, b) => a - b);
      const index = 0.75 * (sorted.length - 1);
      const lower = Math.floor(index);
      const upper = Math.ceil(index);
      const weight = index - lower;
      q3 = sorted[lower] * (1 - weight) + sorted[upper] * weight;
    }
    return { avg, q3, max };
  }, [hourlyStats]);

  const maxHourlyCount = Math.max(flowStats.max, 10) + 2;

  const formatMinutes = (min: number) => {
    if (min < 0) return "0m";
    if (min === 0) return "0m";
    if (min < 1) return "< 1m";
    if (min < 60) return `${Math.round(min)}m`;
    const h = Math.floor(min / 60);
    const m = Math.round(min % 60);
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
  };

  const DonutChart = ({ data, colorMapper, filterType, total }: { data: any[], colorMapper: (l: string) => string, filterType: keyof ActiveFilters, total: number }) => {
    let currentAngle = 0;
    return (
      <div className="flex items-center justify-center relative w-full h-full p-2">
        <svg viewBox="0 0 100 100" className="w-full h-full max-h-[120px] -rotate-90">
          {data.map((item, i) => {
            const angle = (item.pct / 100) * 360;
            const color = colorMapper(item.label);
            if (angle >= 359.9) return <circle key={i} cx="50" cy="50" r="32.5" fill="none" stroke={color} strokeWidth="15" className="transition-all hover:opacity-80 cursor-pointer" onClick={() => toggleFilter(filterType, item.label)} />;
            if (angle <= 0.1) return null;
            const x1 = 50 + 40 * Math.cos((currentAngle * Math.PI) / 180);
            const y1 = 50 + 40 * Math.sin((currentAngle * Math.PI) / 180);
            const x2 = 50 + 40 * Math.cos(((currentAngle + angle) * Math.PI) / 180);
            const y2 = 50 + 40 * Math.sin(((currentAngle + angle) * Math.PI) / 180);
            const largeArcFlag = angle > 180 ? 1 : 0;
            const d = `M 50 50 L ${x1} ${y1} A 40 40 0 ${largeArcFlag} 1 ${x2} ${y2} Z`;
            const path = <path key={i} d={d} fill={color} className="transition-all hover:opacity-80 cursor-pointer" onClick={() => toggleFilter(filterType, item.label)} />;
            currentAngle += angle;
            return path;
          })}
          <circle cx="50" cy="50" r="25" fill="white" className="dark:fill-slate-800" />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center flex-col pointer-events-none"><span className="text-[14px] font-black text-slate-900 dark:text-white leading-none">{total}</span><span className="text-[11px] font-black text-slate-600 dark:text-slate-200 uppercase tracking-tighter">Total</span></div>
      </div>
    );
  };

  return (
    <div className="flex flex-col gap-4 animate-fadeIn h-[calc(100vh-100px)] overflow-hidden">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 shrink-0">
        {[
          { label: 'Recebido', val: totalReceived, icon: Box, color: 'indigo', filter: 'Recebido' },
          { label: 'Concluído', val: totalDelivered, icon: Plane, color: 'emerald', filter: 'Concluído' },
          { label: 'Andamento', val: totalInProgress, icon: Activity, color: 'blue', filter: 'Andamento' },
          { label: 'Cancelado', val: totalCanceled, icon: XCircle, color: 'red', filter: 'Cancelado' }
        ].map((kpi, i) => (
          <button key={i} onClick={() => toggleFilter('status', kpi.filter)} className={`flex-1 bg-white dark:bg-slate-800 border p-3 flex items-center gap-3 transition-all text-left relative ${activeFilters.status === kpi.filter ? `border-${kpi.color}-600 ring-2 ring-${kpi.color}-100 dark:ring-${kpi.color}-900 shadow-inner` : 'border-slate-200 dark:border-slate-700 panel-shadow hover:border-slate-400 dark:hover:border-slate-600'}`}>
            <div className={`w-10 h-10 bg-${kpi.color}-50 dark:bg-${kpi.color}-900/20 flex items-center justify-center text-${kpi.color}-600 dark:text-${kpi.color}-400 shrink-0 rounded`}><kpi.icon size={20} /></div>
            <div className="flex-1"><p className="text-[11px] font-black text-slate-600 dark:text-slate-200 uppercase tracking-widest leading-none mb-1">{kpi.label}</p><p className="text-2xl font-black text-slate-900 dark:text-white font-mono-tech leading-none">{kpi.val}</p></div>
          </button>
        ))}
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 panel-shadow p-3 flex items-center gap-2 w-full shrink-0"><div className="flex-1"><CustomDateRangePicker start={dateRange.start} end={dateRange.end} onChange={(s, e) => setDateRange({ start: s, end: e })} /></div></div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 flex-1 min-h-0">
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 panel-shadow flex flex-col overflow-hidden">
          <div className="bg-slate-50 dark:bg-slate-900/50 px-3 py-2 border-b border-slate-200 dark:border-slate-700 shrink-0 flex flex-col gap-2">
            <div className="flex items-center justify-between"><h3 className="text-[11px] font-black text-slate-800 dark:text-slate-100 uppercase tracking-widest flex items-center gap-2"><ShieldCheck size={14} className="text-slate-700 dark:text-slate-300" /> Líderes de Cadastro</h3>{activeFilters.usuarioCadastro && <button onClick={() => toggleFilter('usuarioCadastro', activeFilters.usuarioCadastro)} className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded transition-colors"><X size={14} className="text-red-500" /></button>}</div>
            <div className="relative group/search"><Search className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" size={12} /><input type="text" placeholder="BUSCAR USUÁRIO..." value={activeFilters.sistemaRankSearch} onChange={(e) => setActiveFilters(prev => ({ ...prev, sistemaRankSearch: e.target.value }))} className="w-full h-8 pl-8 pr-8 text-[10px] font-black font-mono-tech uppercase outline-none border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder-slate-400 focus:border-slate-400 transition-all" />{activeFilters.sistemaRankSearch && (<button onClick={() => setActiveFilters(prev => ({ ...prev, sistemaRankSearch: '' }))} className="absolute right-2 top-1/2 -translate-y-1/2"><X size={12} className="text-slate-400" /></button>)}</div>
          </div>
          <div className="flex-1 p-1 space-y-1 overflow-y-auto custom-scrollbar">
            {sistemaRank.length === 0 ? (<div className="p-8 text-center"><p className="text-[10px] font-black text-slate-400 uppercase italic">Vazio</p></div>) : (
              sistemaRank.map(([name, count], idx) => {
                const isMe = activeUser?.Nome_Completo === name;
                return (
                  <button key={name} onClick={() => toggleFilter('usuarioCadastro', name)} className={`w-full flex items-center justify-between py-1.5 px-2 border-l-4 transition-all ${activeFilters.usuarioCadastro === name ? 'bg-slate-900 dark:bg-slate-100 dark:text-slate-900 text-white border-slate-950 dark:border-white' : isMe ? 'bg-indigo-50/50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 border-indigo-600 hover:bg-indigo-100' : 'bg-slate-50/50 dark:bg-slate-900/30 text-slate-800 dark:text-slate-100 border-slate-400 hover:bg-slate-100 dark:hover:bg-slate-900/20'}`}>
                    <span className="text-[11px] font-black uppercase truncate pr-1">#{idx+1} {name} {isMe && "(VOCÊ)"}</span>
                    <span className="text-[11px] font-black font-mono-tech">{count}</span>
                  </button>
                );
              })
            )}
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 panel-shadow flex flex-col overflow-hidden">
          <div className="bg-slate-50 dark:bg-slate-900/50 px-3 py-2 border-b border-slate-200 dark:border-slate-700 shrink-0 flex flex-col gap-2">
            <div className="flex items-center justify-between"><h3 className="text-[11px] font-black text-slate-800 dark:text-slate-100 uppercase tracking-widest flex items-center gap-2"><Award size={14} className="text-indigo-600" /> Líderes de Puxe</h3>{activeFilters.usuario && <button onClick={() => toggleFilter('usuario', activeFilters.usuario)} className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded transition-colors"><X size={14} className="text-red-500" /></button>}</div>
            <div className="relative group/search"><Search className="absolute left-2 top-1/2 -translate-y-1/2 text-indigo-300" size={12} /><input type="text" placeholder="BUSCAR OPERADOR..." value={activeFilters.operacaoRankSearch} onChange={(e) => setActiveFilters(prev => ({ ...prev, operacaoRankSearch: e.target.value }))} className="w-full h-8 pl-8 pr-8 text-[10px] font-black font-mono-tech uppercase outline-none border border-indigo-100 dark:border-indigo-900/50 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder-indigo-300 focus:border-indigo-400 transition-all" />{activeFilters.operacaoRankSearch && (<button onClick={() => setActiveFilters(prev => ({ ...prev, operacaoRankSearch: '' }))} className="absolute right-2 top-1/2 -translate-y-1/2"><X size={12} className="text-indigo-400" /></button>)}</div>
          </div>
          <div className="flex-1 p-1 space-y-1 overflow-y-auto custom-scrollbar">
            {atribuicaoRank.length === 0 ? (<div className="p-8 text-center"><p className="text-[10px] font-black text-slate-400 uppercase italic">Vazio</p></div>) : (
              atribuicaoRank.map(([name, count], idx) => {
                const isMe = activeUser?.Nome_Completo === name;
                return (
                  <button key={name} onClick={() => toggleFilter('usuario', name)} className={`w-full flex items-center justify-between py-1.5 px-2 border-l-4 transition-all ${activeFilters.usuario === name ? 'bg-indigo-600 text-white border-indigo-700' : isMe ? 'bg-indigo-50/50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 border-indigo-600 hover:bg-indigo-100' : 'bg-slate-50/50 dark:bg-slate-900/30 text-slate-800 dark:text-slate-100 border-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/20'}`}>
                    <span className="text-[11px] font-black uppercase truncate pr-1">#{idx+1} {name} {isMe && "(VOCÊ)"}</span>
                    <span className="text-[11px] font-black font-mono-tech">{count}</span>
                  </button>
                );
              })
            )}
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 panel-shadow flex flex-col overflow-hidden">
          <div className={`px-3 py-2 border-b transition-all shrink-0 flex flex-col gap-2 ${activeFilters.onlyViolations ? 'bg-red-600 border-red-700' : 'bg-red-50 dark:bg-red-900/20 border-red-100 dark:border-red-900/50'}`}>
            <div className="flex items-center justify-between"><div onClick={() => toggleFilter('onlyViolations', true)} className="flex items-center gap-2 cursor-pointer flex-1"><h3 className={`text-[11px] font-black uppercase tracking-widest flex items-center gap-2 ${activeFilters.onlyViolations ? 'text-white' : 'text-red-600 dark:text-red-300'}`}><AlertTriangle size={14} /> Alertas & Conformidade</h3></div>{activeFilters.onlyViolations && <button onClick={() => toggleFilter('onlyViolations', true)} className="p-1 rounded transition-colors hover:bg-red-700"><X size={14} className="text-white" /></button>}</div>
            <div className="relative group/search"><Search className={`absolute left-2 top-1/2 -translate-y-1/2 transition-colors ${activeFilters.onlyViolations ? 'text-red-200' : 'text-slate-400'}`} size={12} /><input type="text" placeholder="PESQUISAR MANIFESTO..." value={activeFilters.manifestoSearch} onChange={(e) => setActiveFilters(prev => ({ ...prev, manifestoSearch: e.target.value }))} className={`w-full h-8 pl-8 pr-8 text-[10px] font-black font-mono-tech uppercase outline-none border transition-all ${activeFilters.onlyViolations ? 'bg-red-700 border-red-500 text-white placeholder-red-300 focus:bg-red-800' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 focus:border-indigo-500'}`} />{activeFilters.manifestoSearch && (<button onClick={() => setActiveFilters(prev => ({ ...prev, manifestoSearch: '' }))} className="absolute right-2 top-1/2 -translate-y-1/2"><X size={12} className={activeFilters.onlyViolations ? 'text-red-200' : 'text-slate-400'} /></button>)}</div>
          </div>
          <div className="flex-1 p-1 space-y-1 overflow-y-auto custom-scrollbar">
            {filteredManifestos.length === 0 ? (<div className="p-8 text-center"><p className="text-[10px] font-black text-slate-400 dark:text-slate-600 uppercase italic">Nenhum manifesto encontrado</p></div>) : (
              filteredManifestos.map((m) => {
                const violation = getViolationReason(m);
                const isActive = activeFilters.manifestoId === m.id;
                return (
                  <div key={m.id} className="flex gap-1 items-stretch group"><button onClick={() => toggleFilter('manifestoId', m.id)} className={`flex-1 flex items-center justify-between py-1.5 px-2 border-l-2 transition-all ${isActive ? 'bg-slate-900 dark:bg-indigo-600 text-white border-indigo-500' : violation ? 'bg-red-50 dark:bg-red-900/10 text-red-900 dark:text-red-200 border-red-500 hover:bg-red-100 dark:hover:bg-red-900/20' : 'bg-slate-50/50 dark:bg-slate-900/30 text-slate-800 dark:text-slate-100 border-slate-200 dark:border-slate-700'}`}><div className="flex items-center gap-1.5 overflow-hidden"><span className="text-[11px] font-black uppercase font-mono-tech truncate shrink-0">{m.id}</span>{violation && <span className="text-[11px] font-black uppercase px-1 py-0.5 bg-red-600 text-white rounded-sm whitespace-nowrap">{violation}</span>}</div><ChevronRight size={14} className="text-slate-300" /></button><button title="Dossiê Completo" onClick={() => openHistory && openHistory(m.id)} className="w-10 flex items-center justify-center bg-slate-100 dark:bg-slate-900 hover:bg-indigo-600 hover:text-white dark:hover:bg-indigo-600 text-slate-500 dark:text-slate-400 transition-all border border-slate-200 dark:border-slate-700"><FileSearch size={14} /></button></div>
                );
              })
            )}
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 panel-shadow flex flex-col overflow-hidden">
          <div className="bg-slate-50 dark:bg-slate-900/50 px-3 py-2 border-b border-slate-200 dark:border-slate-700 shrink-0 flex items-center justify-between"><h3 className="text-[11px] font-black text-slate-800 dark:text-slate-100 uppercase tracking-widest flex items-center gap-2"><PieChart size={14} className="text-indigo-600" /> Volume por Turno</h3>{activeFilters.turno && <button onClick={() => toggleFilter('turno', activeFilters.turno)} className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded transition-colors"><X size={14} className="text-red-500" /></button>}</div>
          <div className="flex-1 flex flex-col items-center justify-start p-3 min-h-0 overflow-hidden"><DonutChart data={turnStats} colorMapper={getTurnColor} filterType="turno" total={turnStats.reduce((acc, curr) => acc + curr.count, 0)} /><div className="flex flex-col gap-0.5 w-full mt-2">{turnStats.map((item, i) => (<div key={i} onClick={() => toggleFilter('turno', item.label)} className="flex items-center justify-between cursor-pointer p-1 rounded hover:bg-slate-50 dark:hover:bg-slate-900/50"><div className="flex items-center gap-2 overflow-hidden"><div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: getTurnColor(item.label) }}></div><span className="text-[10px] font-black uppercase truncate text-slate-600 dark:text-slate-200">{item.label}</span></div><div className="flex items-center gap-2"><span className="text-[10px] font-black font-mono-tech text-slate-900 dark:text-slate-100">{item.count}</span><span className="text-[10px] font-black font-mono-tech text-indigo-500 dark:text-indigo-300">{item.pct.toFixed(1)}%</span></div></div>))}</div></div>
        </div>

        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 panel-shadow flex flex-col overflow-hidden">
          <div className="bg-slate-50 dark:bg-slate-900/50 px-3 py-2 border-b border-slate-200 dark:border-slate-700 shrink-0"><h3 className="text-[11px] font-black text-slate-800 dark:text-slate-100 uppercase tracking-widest flex items-center gap-2"><Target size={14} className="text-slate-800 dark:text-slate-100" /> Indicadores Performance SLA</h3></div>
          <div className="flex-1 flex flex-col gap-2 p-3 overflow-hidden">{[{ label: 'APRESENTAÇÃO (CIA)', avg: slaStats.avgE, max: slaStats.maxE, maxId: slaStats.maxE_id, target: '10m', pct: slaStats.pctE, color: 'blue' },{ label: 'MANIFESTO DISPONÍVEL (WFS)', avg: slaStats.avgP, max: slaStats.maxP, maxId: slaStats.maxP_id, target: '2h', pct: slaStats.pctP, color: 'amber' },{ label: 'COMPARECIMENTO (CIA)', avg: slaStats.avgA, max: slaStats.maxA, maxId: slaStats.maxA_id, target: '15m', pct: slaStats.pctA, color: 'emerald' }].map((s, i) => (<div key={i} className="flex-1 flex flex-col border border-slate-100 dark:border-slate-700 shadow-sm min-h-0 overflow-hidden"><div className={`bg-${s.color}-50/50 dark:bg-${s.color}-900/20 px-2 py-1 border-b border-${s.color}-100 dark:border-${s.color}-900/50`}><p className={`text-[11px] font-black text-${s.color}-700 dark:text-${s.color}-300 uppercase tracking-[0.2em] leading-none`}>{s.label}</p></div><div className={`flex-1 flex flex-col justify-center p-2 border-l-4 border-${s.color}-600 bg-white dark:bg-slate-900 min-h-0`}><div className="grid grid-cols-4 gap-1"><div className="text-center"><p className="text-[11px] font-black text-slate-400 dark:text-slate-500 uppercase leading-none mb-1">Média</p><p className={`text-[11px] font-black font-mono-tech text-${s.color}-700 dark:text-${s.color}-300`}>{formatMinutes(s.avg)}</p></div><div className={`text-center cursor-pointer group/max transition-all hover:bg-slate-50 dark:hover:bg-slate-800 rounded p-1 -m-1`} onClick={() => s.maxId && openHistory && openHistory(s.maxId)} title={s.maxId ? `Clique para ver o manifesto ${s.maxId}` : ""}><p className="text-[11px] font-black text-slate-400 dark:text-slate-500 uppercase leading-none mb-1 group-hover/max:text-indigo-600">Máx</p><div className="flex items-center justify-center gap-0.5"><p className={`text-[11px] font-black font-mono-tech text-slate-600 dark:text-slate-300 group-hover/max:text-indigo-600`}>{formatMinutes(s.max)}</p>{s.maxId && <ExternalLink size={8} className="text-slate-300 dark:text-slate-600 group-hover/max:text-indigo-400" />}</div></div><div className="text-center"><p className="text-[11px] font-black text-slate-400 dark:text-slate-500 uppercase leading-none mb-1">Limite</p><p className={`text-[11px] font-black font-mono-tech text-slate-900 dark:text-slate-100`}>{s.target}</p></div><div className="text-center"><p className="text-[11px] font-black text-slate-400 dark:text-slate-500 uppercase leading-none mb-1">SLA</p><p className={`text-[11px] font-black font-mono-tech ${s.pct >= 95 ? 'text-emerald-600' : 'text-amber-600'}`}>{`${Math.round(s.pct)}%`}</p></div></div></div></div>))}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 h-[40%] shrink-0">
        <div className="lg:col-span-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 panel-shadow flex flex-col overflow-hidden">
          <div className="bg-slate-50 dark:bg-slate-900/50 px-3 py-2 border-b border-slate-200 dark:border-slate-700 shrink-0 flex items-center justify-between"><h3 className="text-[11px] font-black text-slate-800 dark:text-slate-100 uppercase tracking-widest flex items-center gap-2"><BarChart3 size={14} className="text-slate-600 dark:text-slate-300" /> Market Share por CIA</h3>{activeFilters.cia && <button onClick={() => toggleFilter('cia', activeFilters.cia)} className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded transition-colors"><X size={14} className="text-red-500" /></button>}</div>
          <div className="flex-1 flex flex-col gap-1 p-3 overflow-hidden">
            {ciaStats.map((item, i) => (
              <div key={i} onClick={() => toggleFilter('cia', item.label)} className="flex-1 flex flex-col justify-center cursor-pointer group px-2 rounded hover:bg-slate-50 dark:hover:bg-slate-900/20">
                <div className="flex justify-between items-end mb-1"><div className="flex items-center gap-1.5 overflow-hidden"><div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: getCiaColor(item.label) }}></div><span className="text-[11px] font-black uppercase truncate text-slate-600 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-white">{item.label}</span></div><div className="flex items-baseline gap-2 shrink-0"><span className="text-[12px] font-black font-mono-tech text-slate-900 dark:text-slate-100">{item.count}</span><span className="text-[11px] font-black text-indigo-500 dark:text-indigo-300 font-mono-tech">{item.pct.toFixed(1)}%</span></div></div>
                <div className="h-2 bg-slate-100 dark:bg-slate-900 rounded-sm overflow-hidden flex items-center px-0.5"><div className="h-1 rounded-xs transition-all duration-500 shadow-sm" style={{ width: `${item.pct}%`, backgroundColor: getCiaColor(item.label) }}></div></div>
              </div>
            ))}
          </div>
        </div>

        <div className="lg:col-span-9 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 panel-shadow flex flex-col overflow-hidden">
          <div className="bg-slate-900 dark:bg-slate-950 px-5 py-2.5 flex items-center justify-between shrink-0"><h3 className="text-[11px] font-black text-white uppercase tracking-[0.2em] flex items-center gap-2"><BarChart3 size={16} className="text-indigo-400" /> Fluxo Hora a Hora {activeFilters.hora.length > 0 ? `- Selecionados: ${activeFilters.hora.length} Horários` : ''}</h3><div className="flex items-center gap-4"><div className={`flex items-center gap-2 px-3 py-1 border rounded transition-all ${isCtrlPressed ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-slate-800 border-slate-700 text-slate-400'}`}><MousePointer2 size={12} className={isCtrlPressed ? 'animate-pulse' : ''} /><span className="text-[9px] font-black uppercase tracking-widest">{isCtrlPressed ? 'SELEÇÃO MÚLTIPLA ATIVA' : 'Mantenha CTRL para Seleção Múltipla'}</span></div>{activeFilters.hora.length > 0 && (<button onClick={() => setActiveFilters(prev => ({ ...prev, hora: [] }))} className="flex items-center gap-2 bg-red-600 hover:bg-red-500 text-white text-[9px] font-black px-2 py-1 rounded transition-colors"><X size={12} /> LIMPAR FILTROS ({activeFilters.hora.length})</button>)}<span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">WFS MONITORING CENTER</span></div></div>
          <div className="flex-1 flex flex-col p-4 px-12 relative overflow-hidden">
            <div className="absolute inset-x-12 bottom-12 top-6 pointer-events-none"><div className="absolute inset-0 flex flex-col justify-between">{[...Array(5)].map((_, i) => <div key={i} className="w-full border-t border-dashed border-slate-100 dark:border-slate-700/50"></div>)}<div className="w-full h-px bg-slate-400 dark:bg-slate-600"></div></div></div>
            <div className="flex-1 flex items-end gap-1 relative z-10">
              <div className="absolute left-0 right-0 border-t-2 border-dashed border-red-500 z-40 transition-all duration-500 flex items-center" style={{ bottom: `${(flowStats.max / maxHourlyCount) * 100}%` }}><div className="absolute left-0 -translate-x-1/2 bg-red-600 text-white text-[11px] font-black px-1.5 py-0.5 rounded shadow-sm whitespace-nowrap">PICO (MÁX): {flowStats.max}</div></div>
              <div className="absolute left-0 right-0 border-t-2 border-dashed border-indigo-500 z-30 transition-all duration-500 flex items-center" style={{ bottom: `${(flowStats.q3 / maxHourlyCount) * 100}%` }}><div className="absolute right-0 translate-x-1/2 bg-indigo-500 text-white text-[11px] font-black px-1.5 py-0.5 rounded shadow-sm whitespace-nowrap">75% (Q3): {flowStats.q3.toFixed(1)}</div></div>
              <div className="absolute left-0 right-0 border-t-2 border-dashed border-amber-500 z-30 transition-all duration-500 flex items-center" style={{ bottom: `${(flowStats.avg / maxHourlyCount) * 100}%` }}><div className="absolute left-0 -translate-x-1/2 bg-amber-500 text-white text-[11px] font-black px-1.5 py-0.5 rounded shadow-sm whitespace-nowrap">MÉDIA: {flowStats.avg.toFixed(1)}</div></div>
              {hourlyStats.map((h) => {
                const isSelected = activeFilters.hora.includes(h.hour);
                const hasDimmed = activeFilters.hora.length > 0 && !isSelected;
                return (
                  <button key={h.hour} onClick={() => toggleFilter('hora', h.hour)} disabled={h.isFuture} className={`flex-1 flex flex-col items-center h-full justify-end group transition-all duration-300 outline-none ${h.isFuture ? 'cursor-default' : 'cursor-pointer'} ${hasDimmed ? 'opacity-30' : 'opacity-100'}`}>
                    {!h.isFuture && (<div className="flex items-end justify-center w-full h-full pb-1"><div className={`w-full max-w-[36px] transition-all rounded-t-sm relative shadow-sm ${isSelected ? 'bg-indigo-600 scale-x-110 shadow-lg shadow-indigo-500/50' : 'bg-gradient-to-t from-indigo-700 to-indigo-500 dark:from-indigo-600 dark:to-indigo-400 group-hover:scale-y-105'}`} style={{ height: h.received > 0 ? `${(h.received / maxHourlyCount) * 100}%` : '2px' }}>{h.received > 0 && (<div className={`absolute -top-6 left-0 right-0 text-center text-[11px] font-black rounded border shadow-sm z-20 ${isSelected ? 'bg-indigo-600 text-white border-indigo-700' : 'text-indigo-700 dark:text-indigo-200 bg-white/90 dark:bg-slate-900/90 border-indigo-100 dark:border-indigo-900'}`}>{h.received}</div>)}{h.received === 0 && <div className="absolute -top-6 left-0 right-0 text-center text-[11px] font-black text-slate-600 dark:text-slate-400 bg-white/50 dark:bg-slate-900/50 rounded z-20">0</div>}</div></div>)}
                  </button>
                );
              })}
            </div>
            <div className="h-8 mt-2 flex items-center border-t border-slate-900 dark:border-slate-700 pt-2 relative z-20">{hourlyStats.map((h) => (<div key={h.hour} className="flex-1 text-center"><span className={`text-[11px] font-black font-mono-tech tracking-tighter ${activeFilters.hora.includes(h.hour) ? 'text-indigo-600 dark:text-indigo-400 font-black underline underline-offset-4' : h.received > 0 ? 'text-slate-700 dark:text-slate-300' : h.isFuture ? 'text-slate-200 dark:text-slate-800' : 'text-slate-400 dark:text-slate-500'}`}>{!h.isFuture ? String(h.hour).padStart(2, '0') : ''}</span></div>))}</div>
          </div>
        </div>
      </div>
    </div>
  );
};
