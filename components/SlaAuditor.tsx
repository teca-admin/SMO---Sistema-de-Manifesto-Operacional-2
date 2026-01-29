
import React, { useMemo, useState } from 'react';
import { Manifesto, CIAS } from '../types';
import { 
  ClipboardCheck, 
  Search, 
  X, 
  Filter, 
  FileSearch, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  ArrowRight,
  Target,
  LayoutTemplate,
  Check,
  ChevronDown,
  ShieldCheck,
  ShieldAlert
} from 'lucide-react';
import { CustomDateRangePicker } from './CustomDateRangePicker';

interface SlaAuditorProps {
  manifestos: Manifesto[];
  openHistory?: (id: string) => void;
}

export const SlaAuditor: React.FC<SlaAuditorProps> = ({ manifestos, openHistory }) => {
  const [dateRange, setDateRange] = useState({
    start: new Date(new Date().setHours(0, 0, 0, 0)).toISOString(),
    end: new Date(new Date().setHours(23, 59, 59, 999)).toISOString()
  });

  const [visibleSlas, setVisibleSlas] = useState({
    apre: true,
    wfs: true,
    comp: true
  });

  const [filters, setFilters] = useState({
    cia: '',
    turno: '',
    search: '',
    compliance: '' // '', 'CONFORME', 'NÃO CONFORME'
  });

  const parseAnyDate = (dateStr: string | undefined): Date | null => {
    if (!dateStr || dateStr === '---' || dateStr === '') return null;
    try {
      const directDate = new Date(dateStr);
      if (!isNaN(directDate.getTime())) return directDate;
      const parts = dateStr.split(/[\/\s,:]+/);
      if (parts.length >= 5) {
        return new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]), parseInt(parts[3]), parseInt(parts[4]));
      }
      return null;
    } catch { return null; }
  };

  const getDiffMinutes = (startStr: string | undefined, endStr: string | undefined) => {
    const start = parseAnyDate(startStr);
    const end = parseAnyDate(endStr);
    if (!start || !end) return null;
    const diff = (end.getTime() - start.getTime()) / 60000;
    return Math.max(0, Math.round(diff));
  };

  const formatDateTime = (dateStr: string | undefined) => {
    const d = parseAnyDate(dateStr);
    if (!d) return '--/-- --:--';
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    return (
      <div className="flex items-center gap-1 font-mono-tech">
        <span className="text-[9px] text-slate-500 dark:text-slate-400 font-bold">{day}/{month}</span>
        <span className="text-[10px] text-slate-950 dark:text-indigo-400 font-black tracking-tight">{hours}:{minutes}</span>
      </div>
    );
  };

  const filteredManifestos = useMemo(() => {
    const start = new Date(dateRange.start);
    const end = new Date(dateRange.end);
    
    return manifestos.filter(m => {
      const mDate = parseAnyDate(m.dataHoraRecebido) || parseAnyDate(m.dataHoraPuxado);
      if (!mDate || mDate < start || mDate > end) return false;
      if (filters.cia && m.cia !== filters.cia) return false;
      if (filters.turno && m.turno !== filters.turno) return false;
      if (filters.search && !m.id.toLowerCase().includes(filters.search.toLowerCase())) return false;

      const apreTime = getDiffMinutes(m.dataHoraPuxado, m.dataHoraRecebido);
      const wfsTime = getDiffMinutes(m.dataHoraIniciado, m.dataHoraCompleto);
      const compTime = getDiffMinutes(m.dataHoraCompleto, m.dataHoraRepresentanteCIA);

      const isNonConforming = (apreTime !== null && apreTime > 10) || 
                              (wfsTime !== null && wfsTime > 120) || 
                              (compTime !== null && compTime > 15);

      if (filters.compliance === 'CONFORME' && isNonConforming) return false;
      if (filters.compliance === 'NÃO CONFORME' && !isNonConforming) return false;

      return true;
    });
  }, [manifestos, dateRange, filters]);

  const stats = useMemo(() => {
    let total = filteredManifestos.length;
    let failApre = 0;
    let failWfs = 0;
    let failComp = 0;

    filteredManifestos.forEach(m => {
      const apre = getDiffMinutes(m.dataHoraPuxado, m.dataHoraRecebido);
      const wfs = getDiffMinutes(m.dataHoraIniciado, m.dataHoraCompleto);
      const comp = getDiffMinutes(m.dataHoraCompleto, m.dataHoraRepresentanteCIA);

      if (apre !== null && apre > 10) failApre++;
      if (wfs !== null && wfs > 120) failWfs++;
      if (comp !== null && comp > 15) failComp++;
    });

    const totalFails = failApre + failWfs + failComp;
    return { total, failApre, failWfs, failComp, totalFails };
  }, [filteredManifestos]);

  const toggleSlaVisibility = (key: keyof typeof visibleSlas) => {
    setVisibleSlas(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const visibleColsCount = Object.values(visibleSlas).filter(v => v).length + 2;

  const SlaCell = ({ start, end, diff, limit, label }: { start: string|undefined, end: string|undefined, diff: number|null, limit: number, label: string }) => {
    if (diff === null) return (
       <div className="flex items-center justify-center h-full">
         <span className="text-[9px] text-slate-300 italic font-black uppercase tracking-widest">{label}</span>
       </div>
    );

    const isViolated = diff > limit;

    return (
      <div className="flex items-center justify-between gap-4 h-full w-full">
        <div className="flex items-center gap-4 flex-1">
           <div className="flex items-center gap-1.5 border-l-2 border-indigo-200 dark:border-indigo-900/50 pl-2">
              <span className="text-[8px] font-black text-slate-400 uppercase">I</span>
              {formatDateTime(start)}
           </div>
           <div className="h-4 w-px bg-slate-200 dark:bg-slate-700"></div>
           <div className="flex items-center gap-1.5 border-l-2 border-indigo-400 pl-2">
              <span className="text-[8px] font-black text-slate-400 uppercase">F</span>
              {formatDateTime(end)}
           </div>
        </div>
        
        <div className={`px-2 py-0.5 rounded-sm text-[11px] font-black flex items-center gap-1.5 shadow-sm border shrink-0 min-w-[50px] justify-center ${isViolated ? 'bg-red-600 border-red-700 text-white' : 'bg-emerald-600 border-emerald-700 text-white'}`}>
           <span className="leading-none">{diff}m</span>
           {isViolated ? <AlertTriangle size={10} /> : <Check size={10} />}
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col gap-4 animate-fadeIn h-[calc(100vh-100px)] overflow-hidden">
      {/* Linha Única de Filtros */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 shrink-0">
        <div className="lg:col-span-9 bg-white dark:bg-slate-800 border-2 border-slate-900 dark:border-slate-700 p-2 flex items-center gap-3 shadow-lg">
          {/* Icone / Titulo Compacto */}
          <div className="flex items-center justify-center w-10 h-10 bg-blue-600 rounded shrink-0">
            <Target size={20} className="text-white" />
          </div>

          {/* 1. DATA */}
          <div className="w-[300px] shrink-0">
            <CustomDateRangePicker start={dateRange.start} end={dateRange.end} onChange={(s, e) => setDateRange({ start: s, end: e })} />
          </div>

          {/* 2. CONFORMIDADE */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-900 p-1 border border-slate-200 dark:border-slate-700 rounded-sm shrink-0">
             {[
               { label: 'TODOS', value: '', icon: Filter },
               { label: 'CONFORME', value: 'CONFORME', icon: ShieldCheck, activeColor: 'text-emerald-500' },
               { label: 'NÃO CONFORME', value: 'NÃO CONFORME', icon: ShieldAlert, activeColor: 'text-red-500' }
             ].map((item) => (
               <button 
                key={item.label}
                onClick={() => setFilters({...filters, compliance: item.value})}
                className={`px-3 h-8 text-[9px] font-black uppercase transition-all flex items-center gap-2 ${filters.compliance === item.value ? 'bg-white dark:bg-slate-800 shadow-sm text-slate-900 dark:text-white' : 'text-slate-400 opacity-50 hover:opacity-100'}`}
               >
                 <item.icon size={12} className={filters.compliance === item.value ? item.activeColor : ''} />
                 <span className="hidden xl:inline">{item.label}</span>
               </button>
             ))}
          </div>

          {/* 3. CIA */}
          <div className="w-36 shrink-0">
            <select 
              value={filters.cia}
              onChange={e => setFilters({...filters, cia: e.target.value})}
              className="w-full h-10 px-3 bg-slate-50 dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-700 text-[10px] font-black uppercase outline-none focus:border-blue-600 dark:text-white"
            >
              <option value="">TODAS CIAS</option>
              {CIAS.map(c => <option key={c} value={c}>{c.toUpperCase()}</option>)}
            </select>
          </div>

          {/* 4. PESQUISA MANIFESTO */}
          <div className="relative flex-1 min-w-[120px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
            <input 
              type="text" 
              placeholder="MANIFESTO..."
              value={filters.search}
              onChange={e => setFilters({...filters, search: e.target.value})}
              className="w-full h-10 pl-9 pr-4 bg-slate-50 dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-700 text-[10px] font-black uppercase outline-none focus:border-blue-600 dark:text-white"
            />
          </div>
        </div>

        {/* Resumo Estatístico */}
        <div className="lg:col-span-3 bg-slate-900 dark:bg-black p-2 flex items-center justify-around shadow-lg border-2 border-slate-800">
          <div className="text-center">
            <p className="text-[8px] font-black text-slate-500 uppercase mb-0.5 tracking-tighter">Analisado</p>
            <p className="text-xl font-black text-white font-mono-tech leading-none">{stats.total}</p>
          </div>
          <div className="text-center">
            <p className="text-[8px] font-black text-red-500 uppercase mb-0.5 tracking-tighter">Não Conforme</p>
            <p className="text-xl font-black text-red-500 font-mono-tech leading-none">{stats.totalFails}</p>
          </div>
          <div className="text-center">
            <p className="text-[8px] font-black text-emerald-500 uppercase mb-0.5 tracking-tighter">Eficiência</p>
            <p className="text-xl font-black text-emerald-500 font-mono-tech leading-none">
              {stats.total > 0 ? Math.round(((stats.total - (stats.totalFails / 3)) / stats.total) * 100) : 0}%
            </p>
          </div>
        </div>
      </div>

      {/* Tabela Principal */}
      <div className="flex-1 bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 panel-shadow overflow-hidden flex flex-col">
        <div className="bg-slate-900 px-5 py-2 flex items-center justify-between shrink-0 border-b border-slate-800">
          <h3 className="text-[10px] font-black text-white uppercase tracking-[0.2em] flex items-center gap-2">
            <ClipboardCheck size={16} className="text-blue-400" /> Relatório de Auditoria Compacto
          </h3>
          <div className="flex items-center gap-4">
             <div className="flex items-center bg-slate-800 p-1 rounded gap-1 border border-slate-700">
               {[
                 { label: 'APRE.', key: 'apre', color: 'bg-blue-500' },
                 { label: 'WFS', key: 'wfs', color: 'bg-amber-500' },
                 { label: 'COMP.', key: 'comp', color: 'bg-emerald-500' }
               ].map((item) => (
                 <button 
                  key={item.key}
                  onClick={() => toggleSlaVisibility(item.key as any)}
                  className={`px-2 h-6 text-[8px] font-black uppercase transition-all flex items-center gap-1.5 ${visibleSlas[item.key as keyof typeof visibleSlas] ? 'bg-slate-700 text-white' : 'text-slate-500 opacity-40 hover:opacity-100'}`}
                 >
                   <div className={`w-1.5 h-1.5 rounded-full ${visibleSlas[item.key as keyof typeof visibleSlas] ? item.color : 'bg-slate-500'}`}></div>
                   {item.label}
                 </button>
               ))}
             </div>
             <div className="h-4 w-px bg-slate-700"></div>
             <div className="flex items-center gap-1.5">
                <span className="text-[8px] font-black text-indigo-200 uppercase">I = Início</span>
             </div>
             <div className="flex items-center gap-1.5">
                <span className="text-[8px] font-black text-indigo-400 uppercase">F = Fim</span>
             </div>
          </div>
        </div>

        <div className="flex-1 overflow-auto custom-scrollbar">
          <table className="w-full text-left border-collapse table-fixed">
            <thead className="sticky top-0 z-20">
              <tr className="bg-slate-100 dark:bg-slate-900 border-b-2 border-slate-200 dark:border-slate-700 shadow-sm">
                <th className="py-2 px-4 w-56 text-[9px] font-black text-slate-800 dark:text-slate-200 uppercase tracking-tighter">Manifesto / CIA / Turno</th>
                
                {visibleSlas.apre && (
                  <th className="py-2 px-3 border-l border-slate-200 dark:border-slate-700 text-center text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-tighter bg-blue-50/10 dark:bg-blue-900/5">
                    1. Apresentação (10m)
                  </th>
                )}
                
                {visibleSlas.wfs && (
                  <th className="py-2 px-3 border-l border-slate-200 dark:border-slate-700 text-center text-[10px] font-black text-amber-600 dark:text-amber-500 uppercase tracking-tighter bg-amber-50/10 dark:bg-amber-900/5">
                    2. Disponível (2h)
                  </th>
                )}
                
                {visibleSlas.comp && (
                  <th className="py-2 px-3 border-l border-slate-200 dark:border-slate-700 text-center text-[10px] font-black text-emerald-600 dark:text-emerald-500 uppercase tracking-tighter bg-emerald-50/10 dark:bg-emerald-900/5">
                    3. Comparecimento (15m)
                  </th>
                )}
                
                <th className="py-2 px-2 w-14 border-l border-slate-200 dark:border-slate-700 text-center text-[9px] font-black text-slate-400 uppercase tracking-tighter">Dossiê</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
              {filteredManifestos.length === 0 ? (
                <tr>
                  <td colSpan={visibleColsCount} className="p-20 text-center text-slate-400 dark:text-slate-600 font-black uppercase italic tracking-widest text-[11px]">
                    Nenhum manifesto encontrado com os filtros aplicados.
                  </td>
                </tr>
              ) : (
                filteredManifestos.map(m => {
                  const apreTime = getDiffMinutes(m.dataHoraPuxado, m.dataHoraRecebido);
                  const wfsTime = getDiffMinutes(m.dataHoraIniciado, m.dataHoraCompleto);
                  const compTime = getDiffMinutes(m.dataHoraCompleto, m.dataHoraRepresentanteCIA);

                  return (
                    <tr key={m.id} className="hover:bg-indigo-50/30 dark:hover:bg-indigo-900/10 transition-colors group">
                      <td className="py-1.5 px-4">
                        <div className="flex items-center gap-3">
                          <p className="text-[11px] font-black text-slate-900 dark:text-white font-mono-tech leading-none shrink-0">{m.id}</p>
                          <div className="h-3 w-px bg-slate-200 dark:bg-slate-700"></div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-[8px] font-black px-1.5 py-0.5 bg-slate-900 text-white rounded-xs uppercase tracking-tighter shrink-0">{m.cia}</span>
                            <span className="text-[8px] font-bold text-slate-400 uppercase truncate tracking-tighter shrink-0">{m.turno?.split(' ')[0]}T</span>
                          </div>
                        </div>
                      </td>

                      {visibleSlas.apre && (
                        <td className="py-1 px-3 border-l border-slate-100 dark:border-slate-700 bg-blue-50/5 dark:bg-blue-900/5">
                           <SlaCell start={m.dataHoraPuxado} end={m.dataHoraRecebido} diff={apreTime} limit={10} label="Pendente" />
                        </td>
                      )}

                      {visibleSlas.wfs && (
                        <td className="py-1 px-3 border-l border-slate-100 dark:border-slate-700 bg-amber-50/5 dark:bg-amber-900/5">
                           <SlaCell start={m.dataHoraIniciado} end={m.dataHoraCompleto} diff={wfsTime} limit={120} label="Execução" />
                        </td>
                      )}

                      {visibleSlas.comp && (
                        <td className="py-1 px-3 border-l border-slate-100 dark:border-slate-700 bg-emerald-50/5 dark:bg-emerald-900/5">
                           <SlaCell start={m.dataHoraCompleto} end={m.dataHoraRepresentanteCIA} diff={compTime} limit={15} label="Aguard. CIA" />
                        </td>
                      )}

                      <td className="py-1 px-2 border-l border-slate-100 dark:border-slate-700 text-center">
                         <button 
                          onClick={() => openHistory && openHistory(m.id)}
                          className="p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-all rounded-md"
                          title="Abrir Log de Auditoria"
                         >
                            <FileSearch size={16} />
                         </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-slate-50 dark:bg-slate-900/50 p-2.5 border-2 border-slate-200 dark:border-slate-700 flex items-center justify-between shrink-0">
         <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
               <div className="w-2.5 h-2.5 bg-red-600 rounded-full"></div>
               <span className="text-[9px] font-black text-slate-600 dark:text-slate-300 uppercase">Não Conforme</span>
            </div>
            <div className="flex items-center gap-2">
               <div className="w-2.5 h-2.5 bg-emerald-600 rounded-full"></div>
               <span className="text-[9px] font-black text-slate-600 dark:text-slate-300 uppercase">Conforme</span>
            </div>
         </div>
         <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] italic flex items-center gap-2 opacity-60">
            <Clock size={10} /> Hostinger SMO Auditoria SLA v2.5
         </p>
      </div>
    </div>
  );
};
