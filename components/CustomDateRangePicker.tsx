
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Clock, Check, ArrowRight, ChevronDown } from 'lucide-react';

interface CustomDateRangePickerProps {
  start: string;
  end: string;
  onChange: (start: string, end: string) => void;
}

export const CustomDateRangePicker: React.FC<CustomDateRangePickerProps> = ({ start, end, onChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const [coords, setCoords] = useState({ top: -9999, left: -9999, width: 0 });
  
  const [selectionStep, setSelectionStep] = useState<1 | 2>(1);
  const [activeShortcut, setActiveShortcut] = useState<string | null>(null);

  const [startDate, setStartDate] = useState<Date>(new Date(start));
  const [endDate, setEndDate] = useState<Date>(new Date(end));
  const [viewDate, setViewDate] = useState(new Date(start));

  const [timeInputs, setTimeInputs] = useState({
    start: `${startDate.getHours().toString().padStart(2, '0')}:${startDate.getMinutes().toString().padStart(2, '0')}`,
    end: `${endDate.getHours().toString().padStart(2, '0')}:${endDate.getMinutes().toString().padStart(2, '0')}`
  });

  const MODAL_WIDTH = 320;

  const updateCoords = useCallback(() => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const leftOffset = MODAL_WIDTH * 0.30;
      const calculatedLeft = rect.left - leftOffset;
      
      setCoords({ 
        top: rect.bottom, 
        left: Math.max(10, calculatedLeft), 
        width: rect.width 
      });
    }
  }, []);

  useEffect(() => {
    if (start) {
      const d = new Date(start);
      setStartDate(d);
      setTimeInputs(prev => ({ 
        ...prev, 
        start: `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`
      }));
    }
    if (end) {
      const d = new Date(end);
      setEndDate(d);
      setTimeInputs(prev => ({ 
        ...prev, 
        end: `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`
      }));
    }
  }, [start, end]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current && 
        !containerRef.current.contains(event.target as Node) &&
        popoverRef.current &&
        !popoverRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    } else {
      document.removeEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      updateCoords();
      window.addEventListener('scroll', updateCoords, true);
      window.addEventListener('resize', updateCoords);
    }
    return () => {
      window.removeEventListener('scroll', updateCoords, true);
      window.removeEventListener('resize', updateCoords);
    };
  }, [isOpen, updateCoords]);

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' }) + ' ' + 
           date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  };

  const isFutureDate = (d: Date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const checkDate = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    return checkDate > today;
  };

  const setShortcut = (type: 't1' | 't2' | 't3' | 'hoje') => {
    // Lógica alterada: Para turnos, usamos a data já selecionada (startDate) como base.
    // Para o botão 'Hoje', resetamos para a data atual do sistema.
    const baseDate = type === 'hoje' ? new Date() : new Date(startDate);
    
    let s = new Date(baseDate);
    let e = new Date(baseDate);

    switch (type) {
      case 't1':
        s.setHours(6, 0, 0, 0);
        e.setHours(13, 59, 59, 999);
        break;
      case 't2':
        s.setHours(14, 0, 0, 0);
        e.setHours(21, 59, 59, 999);
        break;
      case 't3':
        s.setHours(22, 0, 0, 0);
        e = new Date(s);
        e.setDate(e.getDate() + 1);
        e.setHours(5, 59, 59, 999);
        break;
      case 'hoje':
        s.setHours(0, 0, 0, 0);
        e.setHours(23, 59, 59, 999);
        break;
    }

    setStartDate(s);
    setEndDate(e);
    setViewDate(new Date(s));
    setTimeInputs({
      start: `${s.getHours().toString().padStart(2, '0')}:${s.getMinutes().toString().padStart(2, '0')}`,
      end: `${e.getHours().toString().padStart(2, '0')}:${e.getMinutes().toString().padStart(2, '0')}`
    });
    setActiveShortcut(type);
    setSelectionStep(1); 
  };

  const daysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();

  const handleDateSelect = (day: number) => {
    const clickedDate = new Date(viewDate.getFullYear(), viewDate.getMonth(), day);
    if (isFutureDate(clickedDate)) return;
    setActiveShortcut(null);

    if (selectionStep === 1) {
      // Configura Início 00:00 e Fim 23:59 do mesmo dia selecionado
      const newStart = new Date(clickedDate);
      newStart.setHours(0, 0, 0, 0);
      
      const newEnd = new Date(clickedDate);
      newEnd.setHours(23, 59, 59, 999);
      
      setStartDate(newStart);
      setEndDate(newEnd);
      setTimeInputs({
        start: "00:00",
        end: "23:59"
      });
      setSelectionStep(2);
    } else {
      // Mantém Início (já selecionado) e define o novo Fim como 23:59 do dia clicado
      const newEnd = new Date(clickedDate);
      newEnd.setHours(23, 59, 59, 999);
      
      if (newEnd < startDate) {
        // Se inverterem a ordem, ajustamos: novo Início (00:00) e novo Fim (23:59)
        const swappedStart = new Date(newEnd);
        swappedStart.setHours(0, 0, 0, 0);
        
        const swappedEnd = new Date(startDate);
        swappedEnd.setHours(23, 59, 59, 999);
        
        setStartDate(swappedStart);
        setEndDate(swappedEnd);
        setTimeInputs({
          start: "00:00",
          end: "23:59"
        });
      } else {
        setEndDate(newEnd);
        setTimeInputs(prev => ({ ...prev, end: "23:59" }));
      }
      setSelectionStep(1);
    }
  };

  const handleTimeInputChange = (field: 'start' | 'end', val: string) => {
    const numeric = val.replace(/\D/g, '').slice(0, 4);
    let formatted = numeric;
    if (numeric.length > 2) {
      formatted = numeric.slice(0, 2) + ':' + numeric.slice(2);
    }
    const h = numeric.slice(0, 2);
    const m = numeric.slice(2);
    if (h && parseInt(h, 10) > 23) return;
    if (m && parseInt(m, 10) > 59) return;
    setTimeInputs(prev => ({ ...prev, [field]: formatted }));
  };

  const handleTimeBlur = (field: 'start' | 'end') => {
    const val = timeInputs[field];
    const parts = val.split(':');
    let h = parseInt(parts[0], 10) || 0;
    let m = parseInt(parts[1], 10) || 0;
    h = Math.min(23, Math.max(0, h));
    m = Math.min(59, Math.max(0, m));
    const formatted = h.toString().padStart(2, '0') + ':' + m.toString().padStart(2, '0');
    setTimeInputs(prev => ({ ...prev, [field]: formatted }));

    if (field === 'start') {
      const newDate = new Date(startDate);
      newDate.setHours(h, m);
      setStartDate(newDate);
    } else {
      const newDate = new Date(endDate);
      newDate.setHours(h, m);
      setEndDate(newDate);
    }
  };

  const applyChanges = () => {
    onChange(startDate.toISOString(), endDate.toISOString());
    setIsOpen(false);
  };

  const renderCalendar = () => {
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    const totalDays = daysInMonth(year, month);
    const startDay = firstDayOfMonth(year, month);
    const days = [];

    for (let i = 0; i < startDay; i++) days.push(<div key={`empty-${i}`} className="h-7"></div>);

    for (let d = 1; d <= totalDays; d++) {
      const current = new Date(year, month, d);
      const isStart = startDate.toDateString() === current.toDateString();
      const isEnd = endDate.toDateString() === current.toDateString();
      const inRange = current > startDate && current < endDate;
      const future = isFutureDate(current);

      days.push(
        <button
          key={d}
          disabled={future}
          onClick={() => handleDateSelect(d)}
          className={`h-7 w-full text-[9px] font-bold flex items-center justify-center transition-all border ${
            isStart || isEnd
              ? 'bg-indigo-600 border-indigo-600 text-white z-10'
              : inRange
                ? 'bg-indigo-50 dark:bg-indigo-900/30 border-indigo-100 dark:border-indigo-800 text-indigo-600 dark:text-indigo-400'
                : future
                  ? 'border-transparent text-slate-200 dark:text-slate-700 cursor-not-allowed opacity-40'
                  : 'border-transparent text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
          }`}
        >
          {d}
        </button>
      );
    }
    return days;
  };

  const months = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

  return (
    <div className="relative w-full" ref={containerRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full h-10 px-3 flex items-center justify-between border-2 transition-all outline-none bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 ${isOpen ? 'border-indigo-600 dark:border-indigo-500 bg-white dark:bg-slate-800 ring-4 ring-indigo-50 dark:ring-indigo-900/20 shadow-sm' : ''}`}
      >
        <div className="flex items-center gap-2 overflow-hidden">
          <CalendarIcon size={14} className="text-indigo-600 dark:text-indigo-400 shrink-0" />
          <span className="text-[9px] font-black text-slate-800 dark:text-slate-200 font-mono-tech whitespace-nowrap">
            {formatDate(startDate)}
          </span>
          <ArrowRight size={10} className="text-slate-300 dark:text-slate-600 shrink-0" />
          <span className="text-[9px] font-black text-slate-800 dark:text-slate-200 font-mono-tech whitespace-nowrap">
            {formatDate(endDate)}
          </span>
        </div>
        <ChevronDown size={14} className={`text-slate-400 dark:text-slate-500 shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && createPortal(
        <div 
          ref={popoverRef}
          className="fixed z-[10050] bg-white dark:bg-slate-800 border-2 border-slate-900 dark:border-slate-700 shadow-2xl flex flex-col w-[320px] animate-fadeIn"
          style={{ 
            top: coords.top + 4, 
            left: coords.left,
            visibility: coords.top === -9999 ? 'hidden' : 'visible'
          }}
        >
          <div className="p-3 bg-white dark:bg-slate-800 border-b border-slate-100 dark:border-slate-700">
            <div className="grid grid-cols-4 gap-1.5">
              {[
                { label: 'Hoje', type: 'hoje', colorClass: 'bg-slate-600 text-white border-slate-700', inactiveClass: 'bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700' },
                { label: '1º T', type: 't1', colorClass: 'bg-blue-600 text-white border-blue-700', inactiveClass: 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 border-slate-200 dark:border-slate-700 hover:bg-blue-50 dark:hover:bg-blue-900/20' },
                { label: '2º T', type: 't2', colorClass: 'bg-amber-500 text-white border-amber-600', inactiveClass: 'bg-white dark:bg-slate-900 text-amber-600 dark:text-amber-400 border-slate-200 dark:border-slate-700 hover:bg-amber-50 dark:hover:bg-amber-900/20' },
                { label: '3º T', type: 't3', colorClass: 'bg-indigo-600 text-white border-indigo-700', inactiveClass: 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 border-slate-200 dark:border-slate-700 hover:bg-indigo-50 dark:hover:bg-indigo-900/20' }
              ].map(bt => {
                const isActive = activeShortcut === bt.type;
                return (
                  <button
                    key={bt.type}
                    onClick={() => setShortcut(bt.type as any)}
                    className={`h-7 border text-[9px] font-black uppercase tracking-tighter transition-all rounded-sm flex items-center justify-center ${
                      isActive ? bt.colorClass : bt.inactiveClass
                    }`}
                  >
                    {bt.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="bg-slate-900 dark:bg-slate-950 text-white p-2 flex items-center justify-between">
            <button onClick={() => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1))} className="p-1 hover:bg-slate-700 rounded"><ChevronLeft size={14} /></button>
            <div className="text-[9px] font-black uppercase tracking-widest">{months[viewDate.getMonth()]} {viewDate.getFullYear()}</div>
            <button onClick={() => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1))} className="p-1 hover:bg-slate-700 rounded"><ChevronRight size={14} /></button>
          </div>

          <div className="p-3">
            <div className="grid grid-cols-7 mb-1 text-center">
              {['D','S','T','Q','Q','S','S'].map(d => <div key={d} className="text-[8px] font-black text-slate-400 dark:text-slate-500 uppercase">{d}</div>)}
            </div>
            <div className="grid grid-cols-7 gap-px bg-slate-100 dark:bg-slate-700 border border-slate-100 dark:border-slate-700">
              {renderCalendar()}
            </div>
          </div>

          <div className="p-3 bg-slate-50 dark:bg-slate-900/50 border-t border-slate-100 dark:border-slate-700 flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-4">
               <div className="space-y-1">
                  <p className="text-[8px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest flex items-center gap-1">
                    <Clock size={10} /> Início
                  </p>
                  <div className="flex items-center gap-1">
                     <input 
                       type="text"
                       value={timeInputs.start} 
                       onChange={(e) => handleTimeInputChange('start', e.target.value)}
                       onBlur={() => handleTimeBlur('start')}
                       placeholder="00:00"
                       className="w-full h-8 text-center text-[11px] font-black font-mono-tech bg-white dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-100 dark:focus:ring-indigo-900 transition-all"
                     />
                  </div>
               </div>
               <div className="space-y-1">
                  <p className="text-[8px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest flex items-center gap-1">
                    <Clock size={10} /> Fim
                  </p>
                  <div className="flex items-center gap-1">
                     <input 
                       type="text"
                       value={timeInputs.end} 
                       onChange={(e) => handleTimeInputChange('end', e.target.value)}
                       onBlur={() => handleTimeBlur('end')}
                       placeholder="23:59"
                       className="w-full h-8 text-center text-[11px] font-black font-mono-tech bg-white dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-100 dark:focus:ring-indigo-900 transition-all"
                     />
                  </div>
               </div>
            </div>
            <button 
              onClick={applyChanges}
              className="w-full h-9 bg-indigo-600 dark:bg-indigo-500 text-white text-[9px] font-black uppercase tracking-widest hover:bg-slate-900 dark:hover:bg-indigo-600 transition-all flex items-center justify-center gap-2 shadow-lg"
            >
              <Check size={14} /> Aplicar Período
            </button>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};
