import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Clock, Check, ArrowRight, Zap } from 'lucide-react';

interface CustomDateRangePickerProps {
  start: string;
  end: string;
  onChange: (start: string, end: string) => void;
}

export const CustomDateRangePicker: React.FC<CustomDateRangePickerProps> = ({ start, end, onChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const [coords, setCoords] = useState({ top: 0, left: 0, width: 0 });
  
  // Controle inteligente de cliques: 1 (selecionando início), 2 (selecionando fim)
  const [selectionStep, setSelectionStep] = useState<1 | 2>(1);
  const [timeMode, setTimeMode] = useState<'start' | 'end'>('start');
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
        // Turno 3 termina às 05:59 do dia seguinte
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
      setTimeMode('start');
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
      setTimeMode('end');
    }
  };

  const handleTimeChange = (type: 'hour' | 'minute', val: number) => {
    setActiveShortcut(null);
    if (timeMode === 'start') {
      const newStart = new Date(startDate);
      if (type === 'hour') newStart.setHours(val);
      else newStart.setMinutes(val);
      setStartDate(newStart);
    } else {
      const newEnd = new Date(endDate);
      if (type === 'hour') newEnd.setHours(val);
      else newEnd.setMinutes(val);
      setEndDate(newEnd);
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
        className={`w-full h-10 px-3 flex items-center justify-between border-2 transition-all outline-none bg-slate-50 border-slate-200 hover:border-slate-300 ${isOpen ? 'border-indigo-600 bg-white ring-4 ring-indigo-50' : ''}`}
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
        <ChevronDownIcon size={14} className="text-slate-400 shrink-0" />
      </button>

      {isOpen && createPortal(
        <div 
          className="fixed z-[10050] bg-white border-2 border-slate-900 shadow-2xl flex flex-col w-[320px] animate-fadeIn"
          style={{ top: coords.top + 4, left: coords.left }}
        >
          {/* ATALHOS RÁPIDOS */}
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

          {/* NAVEGAÇÃO DO MÊS */}
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

          {/* AJUSTE DE HORÁRIO E APLICAÇÃO */}
          <div className="p-3 bg-slate-50 border-t border-slate-100 flex flex-col gap-3">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <Clock size={12} className="text-slate-400" />
                <div className="flex items-center gap-1">
                   <select 
                     value={timeMode === 'start' ? startDate.getHours() : endDate.getHours()} 
                     onChange={(e) => handleTimeChange('hour', parseInt(e.target.value))}
                     className="text-[10px] font-black font-mono-tech bg-white border border-slate-200 px-1 py-0.5 rounded outline-none"
                   >
                     {Array.from({length: 24}, (_, i) => <option key={i} value={i}>{String(i).padStart(2, '0')}</option>)}
                   </select>
                   <span className="text-[10px] font-bold text-slate-400">:</span>
                   <select 
                     value={timeMode === 'start' ? startDate.getMinutes() : endDate.getMinutes()} 
                     onChange={(e) => handleTimeChange('minute', parseInt(e.target.value))}
                     className="text-[10px] font-black font-mono-tech bg-white border border-slate-200 px-1 py-0.5 rounded outline-none"
                   >
                     {Array.from({length: 60}, (_, i) => <option key={i} value={i}>{String(i).padStart(2, '0')}</option>)}
                   </select>
                </div>
              </div>
              <button 
                onClick={applyChanges}
                className="bg-indigo-600 text-white px-4 h-8 text-[9px] font-black uppercase tracking-widest hover:bg-slate-900 transition-all flex items-center gap-2"
              >
                <Check size={14} /> Aplicar
              </button>
            </div>
          </div>
          
          <div className="fixed inset-0 z-[-1]" onClick={() => setIsOpen(false)}></div>
        </div>,
        document.body
      )}
    </div>
  );
};

const ChevronDownIcon = ({ size, className }: { size: number, className: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="m6 9 6 6 6-6"/>
  </svg>
);
