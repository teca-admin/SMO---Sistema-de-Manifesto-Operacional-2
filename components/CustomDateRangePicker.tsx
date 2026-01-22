
import React, { useState, useEffect, useRef } from 'react';
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
  const [coords, setCoords] = useState({ top: 0, left: 0, width: 0 });
  
  const [selectionStep, setSelectionStep] = useState<1 | 2>(1);
  const [activeShortcut, setActiveShortcut] = useState<string | null>(null);

  const [startDate, setStartDate] = useState<Date>(new Date(start));
  const [endDate, setEndDate] = useState<Date>(new Date(end));
  const [viewDate, setViewDate] = useState(new Date(start));

  const MODAL_WIDTH = 320;

  useEffect(() => {
    if (start) setStartDate(new Date(start));
    if (end) setEndDate(new Date(end));
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
    if (isOpen && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const leftOffset = MODAL_WIDTH * 0.30;
      const calculatedLeft = rect.left - leftOffset;
      
      setCoords({ 
        top: rect.bottom + window.scrollY, 
        left: Math.max(10, calculatedLeft), 
        width: rect.width 
      });
    }
  }, [isOpen]);

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' }) + ' ' + 
           date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  };

  const setShortcut = (type: 't1' | 't2' | 't3' | 'hoje') => {
    const now = new Date();
    let s = new Date(now);
    let e = new Date(now);

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
    setActiveShortcut(type);
    setSelectionStep(1); 
  };

  const daysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();

  const handleDateSelect = (day: number) => {
    setActiveShortcut(null);
    const clickedDate = new Date(viewDate.getFullYear(), viewDate.getMonth(), day);
    
    if (selectionStep === 1) {
      const newStart = new Date(clickedDate);
      newStart.setHours(startDate.getHours(), startDate.getMinutes());
      setStartDate(newStart);
      setEndDate(newStart); 
      setSelectionStep(2);
    } else {
      const newEnd = new Date(clickedDate);
      newEnd.setHours(endDate.getHours(), endDate.getMinutes());
      if (newEnd < startDate) {
        const temp = new Date(startDate);
        setStartDate(newEnd);
        setEndDate(temp);
      } else {
        setEndDate(newEnd);
      }
      setSelectionStep(1);
    }
  };

  const handleTimeChange = (target: 'start' | 'end', type: 'hour' | 'minute', val: number) => {
    setActiveShortcut(null);
    if (target === 'start') {
      const newDate = new Date(startDate);
      if (type === 'hour') newDate.setHours(val);
      else newDate.setMinutes(val);
      setStartDate(newDate);
    } else {
      const newDate = new Date(endDate);
      if (type === 'hour') newDate.setHours(val);
      else newDate.setMinutes(val);
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

      days.push(
        <button
          key={d}
          onClick={() => handleDateSelect(d)}
          className={`h-7 w-full text-[9px] font-bold flex items-center justify-center transition-all border ${
            isStart || isEnd
              ? 'bg-indigo-600 border-indigo-600 text-white z-10'
              : inRange
                ? 'bg-indigo-50 border-indigo-100 text-indigo-600'
                : 'border-transparent text-slate-600 hover:bg-slate-100'
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
        className={`w-full h-10 px-3 flex items-center justify-between border-2 transition-all outline-none bg-slate-50 border-slate-200 hover:border-slate-300 ${isOpen ? 'border-indigo-600 bg-white ring-4 ring-indigo-50 shadow-sm' : ''}`}
      >
        <div className="flex items-center gap-2 overflow-hidden">
          <CalendarIcon size={14} className="text-indigo-600 shrink-0" />
          <span className="text-[9px] font-black text-slate-800 font-mono-tech whitespace-nowrap">
            {formatDate(startDate)}
          </span>
          <ArrowRight size={10} className="text-slate-300 shrink-0" />
          <span className="text-[9px] font-black text-slate-800 font-mono-tech whitespace-nowrap">
            {formatDate(endDate)}
          </span>
        </div>
        <ChevronDown size={14} className={`text-slate-400 shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && createPortal(
        <div 
          ref={popoverRef}
          className="fixed z-[10050] bg-white border-2 border-slate-900 shadow-2xl flex flex-col w-[320px] animate-fadeIn"
          style={{ top: coords.top + 4, left: coords.left }}
        >
          <div className="p-3 bg-white border-b border-slate-100">
            <div className="grid grid-cols-4 gap-1.5">
              {[
                { label: 'Hoje', type: 'hoje', colorClass: 'bg-slate-600 text-white border-slate-700', inactiveClass: 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50' },
                { label: '1º T', type: 't1', colorClass: 'bg-blue-600 text-white border-blue-700', inactiveClass: 'bg-white text-blue-600 border-slate-200 hover:bg-blue-50' },
                { label: '2º T', type: 't2', colorClass: 'bg-amber-500 text-white border-amber-600', inactiveClass: 'bg-white text-amber-600 border-slate-200 hover:bg-amber-50' },
                { label: '3º T', type: 't3', colorClass: 'bg-indigo-600 text-white border-indigo-700', inactiveClass: 'bg-white text-indigo-600 border-slate-200 hover:bg-indigo-50' }
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

          <div className="bg-slate-900 text-white p-2 flex items-center justify-between">
            <button onClick={() => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1))} className="p-1 hover:bg-slate-700 rounded"><ChevronLeft size={14} /></button>
            <div className="text-[9px] font-black uppercase tracking-widest">{months[viewDate.getMonth()]} {viewDate.getFullYear()}</div>
            <button onClick={() => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1))} className="p-1 hover:bg-slate-700 rounded"><ChevronRight size={14} /></button>
          </div>

          <div className="p-3">
            <div className="grid grid-cols-7 mb-1 text-center">
              {['D','S','T','Q','Q','S','S'].map(d => <div key={d} className="text-[8px] font-black text-slate-400 uppercase">{d}</div>)}
            </div>
            <div className="grid grid-cols-7 gap-px bg-slate-100 border border-slate-100">
              {renderCalendar()}
            </div>
          </div>

          <div className="p-3 bg-slate-50 border-t border-slate-100 flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-4">
               {/* Início */}
               <div className="space-y-1">
                  <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">
                    <Clock size={10} /> Início
                  </p>
                  <div className="flex items-center gap-1">
                     <select 
                       value={startDate.getHours()} 
                       onChange={(e) => handleTimeChange('start', 'hour', parseInt(e.target.value))}
                       className="flex-1 h-7 text-[10px] font-black font-mono-tech bg-white border border-slate-200 px-1 outline-none focus:border-indigo-500"
                     >
                       {Array.from({length: 24}, (_, i) => <option key={i} value={i}>{String(i).padStart(2, '0')}</option>)}
                     </select>
                     <span className="text-[10px] font-bold text-slate-300">:</span>
                     <select 
                       value={startDate.getMinutes()} 
                       onChange={(e) => handleTimeChange('start', 'minute', parseInt(e.target.value))}
                       className="flex-1 h-7 text-[10px] font-black font-mono-tech bg-white border border-slate-200 px-1 outline-none focus:border-indigo-500"
                     >
                       {Array.from({length: 60}, (_, i) => <option key={i} value={i}>{String(i).padStart(2, '0')}</option>)}
                     </select>
                  </div>
               </div>

               {/* Fim */}
               <div className="space-y-1">
                  <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">
                    <Clock size={10} /> Fim
                  </p>
                  <div className="flex items-center gap-1">
                     <select 
                       value={endDate.getHours()} 
                       onChange={(e) => handleTimeChange('end', 'hour', parseInt(e.target.value))}
                       className="flex-1 h-7 text-[10px] font-black font-mono-tech bg-white border border-slate-200 px-1 outline-none focus:border-indigo-500"
                     >
                       {Array.from({length: 24}, (_, i) => <option key={i} value={i}>{String(i).padStart(2, '0')}</option>)}
                     </select>
                     <span className="text-[10px] font-bold text-slate-300">:</span>
                     <select 
                       value={endDate.getMinutes()} 
                       onChange={(e) => handleTimeChange('end', 'minute', parseInt(e.target.value))}
                       className="flex-1 h-7 text-[10px] font-black font-mono-tech bg-white border border-slate-200 px-1 outline-none focus:border-indigo-500"
                     >
                       {Array.from({length: 60}, (_, i) => <option key={i} value={i}>{String(i).padStart(2, '0')}</option>)}
                     </select>
                  </div>
               </div>
            </div>

            <button 
              onClick={applyChanges}
              className="w-full h-9 bg-indigo-600 text-white text-[9px] font-black uppercase tracking-widest hover:bg-slate-900 transition-all flex items-center justify-center gap-2 shadow-lg"
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
