
import React, { useMemo, useState } from 'react';
import { Manifesto, CIAS } from '../types';
import { 
  BarChart3, 
  Award, 
  Box, 
  Plane, 
  XCircle, 
  Activity,
  Info,
  AlertTriangle,
  Building2,
  FilterX,
  Clock,
  Target,
  ChevronRight,
  PieChart,
  X,
  Timer
} from 'lucide-react';
import { CustomDateRangePicker } from './CustomDateRangePicker';

interface EfficiencyDashboardProps {
  manifestos: Manifesto[];
}

interface ActiveFilters {
  cia: string | null;
  turno: string | null;
  usuario: string | null;
  status: string | null;
  manifestoId: string | null;
  onlyViolations: boolean;
}

export const EfficiencyDashboard: React.FC<EfficiencyDashboardProps> = ({ manifestos }) => {
  const [dateRange, setDateRange] = useState({
    start: new Date(new Date().setHours(0, 0, 0, 0)).toISOString(),
    end: new Date(new Date().setHours(23, 59, 59, 999)).toISOString()
  });

  const [activeFilters, setActiveFilters] = useState<ActiveFilters>({
    cia: null,
    turno: null,
    usuario: null,
    status: null,
    manifestoId: null,
    onlyViolations: false
  });

  // Mapeamento de Cores Consistente para CIAs
  const getCiaColor = (ciaName: string) => {
    const name = ciaName.toUpperCase();
    if (name.includes('AZUL')) return '#4f46e5'; // Indigo
    if (name.includes('GOL')) return '#f59e0b';  // Amber
    if (name.includes('LATAM')) return '#ef4444'; // Red
    if (name.includes('MODERN')) return '#3b82f6'; // Blue
    if (name.includes('TOTAL')) return '#06b6d4'; // Cyan
    return '#6366f1'; // Default
  };

  // Mapeamento de Cores para Turnos
  const getTurnColor = (turn: string) => {
    if (turn === '1º TURNO') return '#3b82f6'; // Blue
    if (turn === '2º TURNO') return '#f59e0b'; // Amber
    if (turn === '3º TURNO') return '#10b981'; // Emerald
    return '#6366f1';
  };

  // Check if any filter is currently applied
  const hasAnyFilter = activeFilters.cia !== null || 
                       activeFilters.turno !== null || 
                       activeFilters.usuario !== null || 
                       activeFilters.status !== null || 
                       activeFilters.manifestoId !== null || 
                       activeFilters.onlyViolations;

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
    const ini = parseAnyDate(m.dataHoraIniciado);
    const com = parseAnyDate(m.dataHoraCompleto);
    const ass = parseAnyDate(m.dataHoraRepresentanteCIA);
    
    if (ini && com) {
      const diff = (com.getTime() - ini.getTime()) / 60000;
      if (diff > 120) return 'Puxe > 2h';
    }
    if (com && ass) {
      const diff = (ass.getTime() - com.getTime()) / 60000;
      if (diff > 15) return 'Assinatura > 15m';
    }
    return null;
  };

  const toggleFilter = (type: keyof ActiveFilters, value: any) => {
    setActiveFilters(prev => ({
      ...prev,
      [type]: prev[type] === value ? (type === 'onlyViolations' ? false : null) : value
    }));
  };

  const clearAllFilters = () => {
    setActiveFilters({ cia: null, turno: null, usuario: null, status: null, manifestoId: null, onlyViolations: false });
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
      if (activeFilters.manifestoId && m.id !== activeFilters.manifestoId) return false;
      if (activeFilters.onlyViolations && !getViolationReason(m)) return false;
      
      if (activeFilters.status) {
        if (activeFilters.status === 'Concluído' && m.status !== 'Manifesto Entregue') return false;
        if (activeFilters.status === 'Andamento' && (m.status === 'Manifesto Entregue' || m.status === 'Manifesto Cancelado')) return false;
        if (activeFilters.status === 'Cancelado' && m.status !== 'Manifesto Cancelado') return false;
      }

      return true;
    });
  }, [manifestos, dateRange, activeFilters]);

  // Cálculos de Métricas
  const totalReceived = filteredManifestos.length;
  const totalDelivered = filteredManifestos.filter(m => m.status === 'Manifesto Entregue').length;
  const totalCanceled = filteredManifestos.filter(m => m.status === 'Manifesto Cancelado').length;
  const totalInProgress = filteredManifestos.filter(m => 
    m.status !== 'Manifesto Entregue' && m.status !== 'Manifesto Cancelado'
  ).length;

  const atribuicaoRank = useMemo(() => {
    const counts: Record<string, number> = {};
    filteredManifestos.forEach(m => {
      if (m.usuarioResponsavel) counts[m.usuarioResponsavel] = (counts[m.usuarioResponsavel] || 0) + 1;
    });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 10);
  }, [filteredManifestos]);

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
    let tE = 0, cE = 0, maxE = 0;
    let tP = 0, cP = 0, maxP = 0, withinP = 0;
    let tA = 0, cA = 0, maxA = 0, withinA = 0;
    
    filteredManifestos.forEach(m => {
      const rec = parseAnyDate(m.dataHoraRecebido);
      const ini = parseAnyDate(m.dataHoraIniciado);
      const com = parseAnyDate(m.dataHoraCompleto);
      const ass = parseAnyDate(m.dataHoraRepresentanteCIA);
      
      if (rec && ini) { 
        const diff = (ini.getTime() - rec.getTime()) / 60000;
        tE += diff; cE++;
        if (diff > maxE) maxE = diff;
      }
      if (ini && com) { 
        const diff = (com.getTime() - ini.getTime()) / 60000;
        tP += diff; cP++;
        if (diff > maxP) maxP = diff;
        if (diff <= 120) withinP++; 
      }
      if (com && ass) { 
        const diff = (ass.getTime() - com.getTime()) / 60000;
        tA += diff; cA++;
        if (diff > maxA) maxA = diff;
        if (diff <= 15) withinA++; 
      }
    });

    return { 
      avgE: cE > 0 ? tE / cE : 0, maxE,
      avgP: cP > 0 ? tP / cP : 0, maxP, 
      pctP: cP > 0 ? (withinP / cP) * 100 : 0,
      avgA: cA > 0 ? tA / cA : 0, maxA,
      pctA: cA > 0 ? (withinA / cA) * 100 : 0
    };
  }, [filteredManifestos]);

  const hourlyStats = useMemo(() => {
    const hours: Record<number, { received: number }> = {};
    for (let i = 0; i < 24; i++) hours[i] = { received: 0 };
    filteredManifestos.forEach(m => {
      const dRec = parseAnyDate(m.dataHoraRecebido);
      if (dRec) hours[dRec.getHours()].received++;
    });
    return Object.entries(hours).map(([h, counts]) => ({ hour: parseInt(h), ...counts }));
  }, [filteredManifestos]);

  const maxHourlyCount = Math.max(...hourlyStats.map(h => h.received), 10) + 2;

  const formatMinutes = (min: number) => {
    if (min <= 0) return "0m";
    if (min < 60) return `${Math.round(min)}m`;
    const h = Math.floor(min / 60);
    const m = Math.round(min % 60);
    return `${h}h ${m}m`;
  };

  // Componente Gráfico Donut (SVG) Reutilizável
  const DonutChart = ({ data, colorMapper, filterType, total }: { 
    data: { label: string, count: number, pct: number }[], 
    colorMapper: (label: string) => string,
    filterType: keyof ActiveFilters,
    total: number
  }) => {
    let currentAngle = 0;
    
    return (
      <div className="flex items-center justify-center relative w-full h-full p-2">
        <svg viewBox="0 0 100 100" className="w-full h-full max-h-[160px] -rotate-90">
          {data.map((item, i) => {
            const angle = (item.pct / 100) * 360;
            const color = colorMapper(item.label);
            
            if (angle >= 359.9) {
              return (
                <circle 
                  key={i} 
                  cx="50" cy="50" r="32.5" 
                  fill="none" 
                  stroke={color} 
                  strokeWidth="15" 
                  className="transition-all hover:opacity-80 cursor-pointer"
                  onClick={() => toggleFilter(filterType, item.label)}
                />
              );
            }

            if (angle <= 0.1) return null;

            const x1 = 50 + 40 * Math.cos((currentAngle * Math.PI) / 180);
            const y1 = 50 + 40 * Math.sin((currentAngle * Math.PI) / 180);
            const x2 = 50 + 40 * Math.cos(((currentAngle + angle) * Math.PI) / 180);
            const y2 = 50 + 40 * Math.sin(((currentAngle + angle) * Math.PI) / 180);
            
            const largeArcFlag = angle > 180 ? 1 : 0;
            const d = `M 50 50 L ${x1} ${y1} A 40 40 0 ${largeArcFlag} 1 ${x2} ${y2} Z`;
            
            const path = (
              <path 
                key={i} 
                d={d} 
                fill={color} 
                className="transition-all hover:opacity-80 cursor-pointer"
                onClick={() => toggleFilter(filterType, item.label)}
              />
            );
            currentAngle += angle;
            return path;
          })}
          <circle cx="50" cy="50" r="25" fill="white" className="dark:fill-slate-800" />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center flex-col pointer-events-none">
          <span className="text-[14px] font-black text-slate-900 dark:text-white leading-none">{total}</span>
          <span className="text-[7px] font-black text-slate-400 uppercase tracking-tighter">Total</span>
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col gap-4 animate-fadeIn h-[calc(100vh-100px)] overflow-hidden">
      
      {/* LINHA SUPERIOR: KPIs + SELETOR (300px) */}
      <div className="flex flex-col md:flex-row gap-3 shrink-0">
        {[
          { label: 'Recebido', val: totalReceived, icon: Box, color: 'indigo', filter: 'Recebido' },
          { label: 'Concluído', val: totalDelivered, icon: Plane, color: 'emerald', filter: 'Concluído' },
          { label: 'Andamento', val: totalInProgress, icon: Activity, color: 'blue', filter: 'Andamento' },
          { label: 'Cancelado', val: totalCanceled, icon: XCircle, color: 'red', filter: 'Cancelado' }
        ].map((kpi, i) => (
          <button 
            key={i} 
            onClick={() => toggleFilter('status', kpi.filter)}
            className={`flex-1 bg-white dark:bg-slate-800 border p-3 flex items-center gap-3 transition-all text-left relative ${
              activeFilters.status === kpi.filter 
                ? `border-${kpi.color}-600 ring-2 ring-${kpi.color}-100 dark:ring-${kpi.color}-900 shadow-inner` 
                : 'border-slate-200 dark:border-slate-700 panel-shadow hover:border-slate-400 dark:hover:border-slate-600'
            }`}
          >
            <div className={`w-10 h-10 bg-${kpi.color}-50 dark:bg-${kpi.color}-900/20 flex items-center justify-center text-${kpi.color}-600 dark:text-${kpi.color}-400 shrink-0 rounded`}>
               <kpi.icon size={20} />
            </div>
            <div className="flex-1">
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">{kpi.label}</p>
              <p className="text-2xl font-black text-slate-900 dark:text-white font-mono-tech leading-none">{kpi.val}</p>
            </div>
            {activeFilters.status === kpi.filter && (
              <div className="absolute top-1 right-1">
                 <X size={10} className="text-slate-400" />
              </div>
            )}
          </button>
        ))}
        {/* CONTAINER DO SELETOR DE DATA COM LARGURA FIXA DE 300PX */}
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 panel-shadow p-3 flex items-center gap-2 w-full md:w-[300px] shrink-0">
          <div className="flex-1">
            <CustomDateRangePicker start={dateRange.start} end={dateRange.end} onChange={(s, e) => setDateRange({ start: s, end: e })} />
          </div>
        </div>
      </div>

      {/* BLOCO CENTRAL: MONITORAMENTO OPERACIONAL (4 COLUNAS) */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 flex-1 min-h-0">
        
        {/* ATRIBUIÇÃO */}
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 panel-shadow flex flex-col overflow-hidden">
          <div className="bg-slate-50 dark:bg-slate-900/50 px-3 py-2 border-b border-slate-200 dark:border-slate-700 shrink-0 flex items-center justify-between">
            <h3 className="text-[10px] font-black text-slate-600 dark:text-slate-300 uppercase tracking-widest flex items-center gap-2">
              <Award size={14} className="text-indigo-600" /> Atribuição
            </h3>
            {activeFilters.usuario && (
              <button onClick={(e) => { e.stopPropagation(); toggleFilter('usuario', activeFilters.usuario); }} className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded transition-colors">
                <X size={14} className="text-red-500" />
              </button>
            )}
          </div>
          <div className="flex-1 p-1 space-y-1 overflow-y-auto custom-scrollbar">
            {atribuicaoRank.map(([name, count], idx) => (
              <button 
                key={name} 
                onClick={() => toggleFilter('usuario', name)}
                className={`w-full flex items-center justify-between py-1.5 px-2 border-l-2 transition-all ${
                  activeFilters.usuario === name 
                    ? 'bg-indigo-600 text-white border-indigo-700' 
                    : 'bg-slate-50/50 dark:bg-slate-900/30 text-slate-700 dark:text-slate-300 border-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/20'
                }`}
              >
                <span className="text-[10px] font-black uppercase truncate pr-1">#{idx+1} {name}</span>
                <span className="text-[11px] font-black font-mono-tech">{count}</span>
              </button>
            ))}
          </div>
        </div>

        {/* ALERTAS & CONFORMIDADE */}
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 panel-shadow flex flex-col overflow-hidden">
          <div className={`px-3 py-2 border-b transition-all shrink-0 flex items-center justify-between ${activeFilters.onlyViolations ? 'bg-red-600 border-red-700' : 'bg-red-50 dark:bg-red-900/20 border-red-100 dark:border-red-900/50'}`}>
            <div onClick={() => toggleFilter('onlyViolations', true)} className="flex items-center gap-2 cursor-pointer flex-1">
              <h3 className={`text-[10px] font-black uppercase tracking-widest flex items-center gap-2 ${activeFilters.onlyViolations ? 'text-white' : 'text-red-600 dark:text-red-400'}`}>
                <AlertTriangle size={14} /> Alertas & Conformidade
              </h3>
            </div>
            {(activeFilters.onlyViolations || activeFilters.manifestoId) && (
              <button onClick={(e) => { e.stopPropagation(); if(activeFilters.onlyViolations) toggleFilter('onlyViolations', true); if(activeFilters.manifestoId) toggleFilter('manifestoId', activeFilters.manifestoId); }} className={`p-1 rounded transition-colors ${activeFilters.onlyViolations ? 'hover:bg-red-700' : 'hover:bg-slate-200 dark:hover:bg-slate-700'}`}>
                <X size={14} className={activeFilters.onlyViolations ? "text-white" : "text-red-500"} />
              </button>
            )}
          </div>
          <div className="flex-1 p-1 space-y-1 overflow-y-auto custom-scrollbar">
            {filteredManifestos.map((m) => {
              const violation = getViolationReason(m);
              const isActive = activeFilters.manifestoId === m.id;
              return (
                <button 
                  key={m.id} 
                  onClick={() => toggleFilter('manifestoId', m.id)}
                  className={`w-full flex items-center justify-between py-1.5 px-2 border-l-2 transition-all ${
                    isActive ? 'bg-slate-900 dark:bg-indigo-600 text-white border-indigo-500' : 
                    violation ? 'bg-red-50 dark:bg-red-900/10 text-red-900 dark:text-red-300 border-red-500 hover:bg-red-100 dark:hover:bg-red-900/20' : 
                    'bg-slate-50/50 dark:bg-slate-900/30 text-slate-700 dark:text-slate-400 border-slate-200 dark:border-slate-700'
                  }`}
                >
                  <div className="flex flex-col items-start overflow-hidden">
                    <span className="text-[10px] font-black uppercase font-mono-tech truncate">{m.id}</span>
                    {violation && <span className="text-[8px] font-bold uppercase text-red-500">{violation}</span>}
                  </div>
                  <ChevronRight size={14} className="text-slate-300" />
                </button>
              );
            })}
          </div>
        </div>

        {/* VOLUME POR TURNO (GRÁFICO DE ROSCA) */}
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 panel-shadow flex flex-col overflow-hidden">
          <div className="bg-slate-50 dark:bg-slate-900/50 px-3 py-2 border-b border-slate-200 dark:border-slate-700 shrink-0 flex items-center justify-between">
            <h3 className="text-[10px] font-black text-slate-600 dark:text-slate-300 uppercase tracking-widest flex items-center gap-2">
              <PieChart size={14} className="text-indigo-600" /> Volume por Turno
            </h3>
            {activeFilters.turno && (
              <button onClick={(e) => { e.stopPropagation(); toggleFilter('turno', activeFilters.turno); }} className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded transition-colors">
                <X size={14} className="text-red-500" />
              </button>
            )}
          </div>
          <div className="flex-1 flex flex-col items-center justify-center p-4">
            <div className="flex-1 w-full max-h-[160px]">
              <DonutChart 
                data={turnStats} 
                colorMapper={getTurnColor} 
                filterType="turno" 
                total={turnStats.reduce((acc, curr) => acc + curr.count, 0)} 
              />
            </div>
            <div className="flex flex-col gap-1 w-full mt-4">
              {turnStats.map((item, i) => {
                const isFiltered = activeFilters.turno === item.label;
                return (
                  <div key={i} onClick={() => toggleFilter('turno', item.label)} className={`flex items-center justify-between cursor-pointer p-1.5 rounded transition-colors ${isFiltered ? 'bg-indigo-50 dark:bg-indigo-900/40 ring-1 ring-indigo-200' : 'hover:bg-slate-50 dark:hover:bg-slate-900/50'}`}>
                    <div className="flex items-center gap-2 overflow-hidden">
                      <div className={`w-2 h-2 rounded-full shrink-0`} style={{ backgroundColor: getTurnColor(item.label) }}></div>
                      <span className={`text-[8px] font-black uppercase truncate ${isFiltered ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400'}`}>{item.label}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-black font-mono-tech text-slate-900 dark:text-slate-100">{item.count}</span>
                      <span className="text-[9px] font-black font-mono-tech text-indigo-500 dark:text-indigo-400">{item.pct.toFixed(1)}%</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* INDICADORES DE PERFORMANCE SLA */}
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 panel-shadow flex flex-col overflow-hidden">
          <div className="bg-slate-50 dark:bg-slate-900/50 px-3 py-2 border-b border-slate-200 dark:border-slate-700 shrink-0">
            <h3 className="text-[10px] font-black text-slate-600 dark:text-slate-300 uppercase tracking-widest flex items-center gap-2">
              <Target size={14} className="text-slate-600" /> Indicadores Performance SLA
            </h3>
          </div>
          
          <div className="flex-1 flex flex-col gap-2 p-3 overflow-hidden">
            {[
              { label: 'SLA RESPOSTA (INICIAR)', avg: slaStats.avgE, max: slaStats.maxE, target: '---', pct: 100, color: 'blue' },
              { label: 'SLA PRODUÇÃO (PUXE)', avg: slaStats.avgP, max: slaStats.maxP, target: '2h', pct: slaStats.pctP, color: 'amber' },
              { label: 'SLA CONFORMIDADE (ASSINATURA)', avg: slaStats.avgA, max: slaStats.maxA, target: '15m', pct: slaStats.pctA, color: 'emerald' }
            ].map((s, i) => (
              <div 
                key={i} 
                className={`flex-1 flex flex-col justify-center p-2 border-l-4 border-${s.color}-600 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-700 shadow-sm transition-all min-h-0`}
              >
                <p className="text-[8px] font-black text-slate-500 dark:text-slate-400 uppercase leading-none mb-2">{s.label}</p>
                <div className="grid grid-cols-4 gap-1">
                  <div className="text-center">
                    <p className="text-[7px] font-black text-slate-300 uppercase leading-none mb-1">Média</p>
                    <p className={`text-[11px] font-black font-mono-tech text-${s.color}-600 dark:text-${s.color}-400`}>{formatMinutes(s.avg)}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-[7px] font-black text-slate-300 uppercase leading-none mb-1">Máx</p>
                    <p className="text-[11px] font-black font-mono-tech text-slate-400">{formatMinutes(s.max)}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-[7px] font-black text-slate-300 uppercase leading-none mb-1">Meta</p>
                    <p className="text-[11px] font-black font-mono-tech text-slate-700 dark:text-slate-300">{s.target}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-[7px] font-black text-slate-300 uppercase leading-none mb-1">SLA</p>
                    <p className={`text-[11px] font-black font-mono-tech ${s.target === '---' ? 'text-slate-300' : s.pct >= 95 ? 'text-emerald-600' : 'text-amber-500'}`}>
                      {s.target === '---' ? '---' : `${Math.round(s.pct)}%`}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* BLOCO INFERIOR: CIA & FLUXO HORA A HORA */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 h-[40%] shrink-0">
        
        {/* CIA */}
        <div className="lg:col-span-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 panel-shadow flex flex-col overflow-hidden">
          <div className="bg-slate-50 dark:bg-slate-900/50 px-3 py-2 border-b border-slate-200 dark:border-slate-700 shrink-0 flex items-center justify-between">
            <h3 className="text-[10px] font-black text-slate-600 dark:text-slate-300 uppercase tracking-widest flex items-center gap-2">
              <BarChart3 size={14} className="text-slate-500" /> Market Share por CIA
            </h3>
            {activeFilters.cia && (
              <button onClick={(e) => { e.stopPropagation(); toggleFilter('cia', activeFilters.cia); }} className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded transition-colors">
                <X size={14} className="text-red-500" />
              </button>
            )}
          </div>
          
          <div className="flex-1 flex flex-col gap-1 p-3 overflow-hidden">
            {ciaStats.map((item, i) => {
              const isFiltered = activeFilters.cia?.toUpperCase() === item.label.toUpperCase();
              return (
                <div 
                  key={i} 
                  onClick={() => toggleFilter('cia', item.label)} 
                  className={`flex-1 flex flex-col justify-center cursor-pointer group px-2 rounded transition-all min-h-0 ${isFiltered ? 'bg-indigo-50 dark:bg-indigo-900/20 ring-1 ring-indigo-200' : 'hover:bg-slate-50 dark:hover:bg-slate-900/20'}`}
                >
                  <div className="flex justify-between items-end mb-1">
                    <div className="flex items-center gap-1.5 overflow-hidden">
                      <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: getCiaColor(item.label) }}></div>
                      <span className={`text-[8px] font-black uppercase truncate transition-colors ${isFiltered ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400 group-hover:text-slate-900 dark:group-hover:text-white'}`}>{item.label}</span>
                    </div>
                    <div className="flex items-baseline gap-2 shrink-0">
                      <span className={`text-[12px] font-black font-mono-tech ${isFiltered ? 'text-indigo-700 dark:text-indigo-300' : 'text-slate-900 dark:text-white'}`}>{item.count}</span>
                      <span className="text-[9px] font-black text-indigo-500/60 font-mono-tech">{item.pct.toFixed(1)}%</span>
                    </div>
                  </div>
                  <div className="h-2 bg-slate-100 dark:bg-slate-900 rounded-sm overflow-hidden flex items-center px-0.5">
                    <div 
                      className="h-1 rounded-xs transition-all duration-500 shadow-sm" 
                      style={{ 
                        width: `${item.pct}%`, 
                        backgroundColor: getCiaColor(item.label) 
                      }}
                    ></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* FLUXO DE RECEBIMENTO HORA A HORA */}
        <div className="lg:col-span-9 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 panel-shadow flex flex-col overflow-hidden">
          <div className="bg-slate-900 dark:bg-slate-950 px-5 py-2.5 flex items-center justify-between shrink-0">
            <h3 className="text-[10px] font-black text-white uppercase tracking-[0.2em] flex items-center gap-2">
               <BarChart3 size={16} className="text-indigo-400" /> Fluxo de Recebimento Hora a Hora
            </h3>
            <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">WFS MONITORING CENTER</span>
          </div>
          
          <div className="flex-1 flex flex-col p-4 px-12 relative overflow-hidden">
            {/* Eixos Guia */}
            <div className="absolute inset-x-12 bottom-12 top-6 pointer-events-none">
               <div className="absolute inset-0 flex flex-col justify-between">
                  {[...Array(5)].map((_, i) => <div key={i} className="w-full border-t border-dashed border-slate-100 dark:border-slate-700/50"></div>)}
                  <div className="w-full h-px bg-slate-400 dark:bg-slate-600"></div> 
               </div>
            </div>

            {/* Barras */}
            <div className="flex-1 flex items-end gap-1 relative z-10">
              {hourlyStats.map((h) => (
                <div key={h.hour} className="flex-1 flex flex-col items-center h-full justify-end group">
                  <div className="flex items-end justify-center w-full h-full pb-1">
                     <div 
                       className="w-full max-w-[36px] bg-gradient-to-t from-indigo-700 to-indigo-500 dark:from-indigo-600 dark:to-indigo-400 group-hover:scale-y-105 transition-all rounded-t-sm relative shadow-sm"
                       style={{ height: h.received > 0 ? `${(h.received / maxHourlyCount) * 100}%` : '2px' }}
                     >
                        {h.received > 0 && (
                          <div className="absolute -top-6 left-0 right-0 text-center text-[10px] font-black text-indigo-700 dark:text-indigo-300 bg-white/90 dark:bg-slate-900/90 rounded border border-indigo-100 dark:border-indigo-900 opacity-0 group-hover:opacity-100 transition-opacity">
                            {h.received}
                          </div>
                        )}
                     </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Legenda Horária */}
            <div className="h-8 mt-2 flex items-center border-t border-slate-900 dark:border-slate-700 pt-2 relative z-20">
              {hourlyStats.map((h) => (
                <div key={h.hour} className="flex-1 text-center">
                  <span className={`text-[9px] font-black font-mono-tech tracking-tighter ${h.received > 0 ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400 dark:text-slate-600'}`}>
                    {String(h.hour).padStart(2, '0')}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="p-2.5 bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-700 flex items-center justify-center shrink-0">
            <div className="flex items-center gap-2">
              <Info size={12} className="text-indigo-500" />
              <p className="text-[9px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-[0.3em]">Consolidado de Fluxo Operacional • WFS BRASIL</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
