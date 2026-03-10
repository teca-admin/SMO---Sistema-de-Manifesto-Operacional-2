
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Check } from 'lucide-react';

interface CustomDateTimePickerProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

export const CustomDateTimePicker: React.FC<CustomDateTimePickerProps> = ({ 
  value, 
  onChange, 
  disabled = false
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [viewDate, setViewDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const [coords, setCoords] = useState({ top: -9999, left: -9999 });

  const updateCoords = useCallback(() => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      // Usamos apenas rect.bottom e rect.left porque o container é FIXED
      setCoords({ top: rect.bottom, left: rect.left });
    }
  }, []);

  useEffect(() => {
    if (value) {
      const d = new Date(value);
      if (!isNaN(d.getTime())) {
        setSelectedDate(d);
        setViewDate(new Date(d.getFullYear(), d.getMonth(), 1));
        const datePart = d.toLocaleDateString('pt-BR');
        const timePart = d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
        setInputValue(`${datePart} ${timePart}`);
      }
    } else {
      setInputValue("");
      setSelectedDate(null);
    }
  }, [value]);

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

  const daysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();

  const handleManualInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value.replace(/\D/g, "");
    if (val.length > 12) val = val.slice(0, 12);
    let formatted = "";
    if (val.length > 0) {
      formatted = val.substring(0, 2);
      if (val.length > 2) {
        formatted += "/" + val.substring(2, 4);
        if (val.length > 4) {
          formatted += "/" + val.substring(4, 8);
          if (val.length > 8) {
            formatted += " " + val.substring(8, 10);
            if (val.length > 10) {
              formatted += ":" + val.substring(10, 12);
            }
          }
        }
      }
    }
    setInputValue(formatted);
    if (formatted.length === 16) {
      const parts = formatted.match(/^(\d{2})\/(\d{2})\/(\d{4})\s(\d{2}):(\d{2})$/);
      if (parts) {
        const [, d, m, y, h, min] = parts;
        const dateObj = new Date(Number(y), Number(m) - 1, Number(d), Number(h), Number(min));
        if (!isNaN(dateObj.getTime())) {
          setSelectedDate(dateObj);
          setViewDate(new Date(dateObj.getFullYear(), dateObj.getMonth(), 1));
          onChange(dateObj.toISOString());
        }
      }
    }
  };

  const handleDateSelect = (day: number) => {
    const newDate = selectedDate ? new Date(selectedDate) : new Date();
    newDate.setFullYear(viewDate.getFullYear());
    newDate.setMonth(viewDate.getMonth());
    newDate.setDate(day);
    setSelectedDate(newDate);
    onChange(newDate.toISOString());
  };

  const renderCalendar = () => {
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    const totalDays = daysInMonth(year, month);
    const startDay = firstDayOfMonth(year, month);
    const days = [];
    for (let i = 0; i < startDay; i++) days.push(<div key={`empty-${i}`} className="h-8"></div>);
    for (let d = 1; d <= totalDays; d++) {
      const isSelected = selectedDate?.getDate() === d && selectedDate?.getMonth() === month && selectedDate?.getFullYear() === year;
      const isToday = new Date().getDate() === d && new Date().getMonth() === month && new Date().getFullYear() === year;
      days.push(
        <button
          key={d}
          type="button"
          onClick={() => handleDateSelect(d)}
          className={`h-8 w-full text-[10px] font-bold flex items-center justify-center transition-all border ${
            isSelected 
              ? 'bg-indigo-600 border-indigo-600 text-white shadow-md z-10' 
              : isToday
                ? 'bg-indigo-50 dark:bg-indigo-900/30 border-indigo-200 dark:border-indigo-800 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100'
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
      <div className="relative">
        <input 
          type="text"
          value={inputValue}
          onChange={handleManualInput}
          onFocus={() => !disabled && setIsOpen(true)}
          placeholder="DD/MM/AAAA HH:MM"
          disabled={disabled}
          maxLength={16}
          className={`w-full h-10 pl-3 pr-10 border-2 text-xs font-bold font-mono-tech transition-all outline-none ${
            disabled 
              ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-600 border-slate-200 dark:border-slate-800' 
              : isOpen 
                ? 'bg-white dark:bg-slate-900 border-indigo-600 dark:border-indigo-500 text-slate-900 dark:text-white' 
                : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 hover:border-slate-300 dark:hover:border-slate-600 focus:bg-white dark:focus:bg-slate-900 focus:border-indigo-600 dark:focus:border-indigo-500'
          }`}
        />
        <CalendarIcon 
          size={14} 
          onClick={() => !disabled && setIsOpen(!isOpen)}
          className={`absolute right-3 top-1/2 -translate-y-1/2 transition-colors cursor-pointer ${isOpen ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400 dark:text-slate-500'}`} 
        />
      </div>

      {isOpen && createPortal(
        <div 
          ref={popoverRef}
          className="fixed z-[10050] bg-white dark:bg-slate-800 border-2 border-slate-800 dark:border-slate-700 shadow-2xl flex flex-col w-[280px] animate-fadeIn"
          style={{ 
            top: coords.top + 4, 
            left: coords.left,
            visibility: coords.top === -9999 ? 'hidden' : 'visible' 
          }}
        >
          <div className="bg-slate-900 dark:bg-slate-950 text-white p-3 flex items-center justify-between">
            <button 
              type="button"
              onClick={(e) => { e.stopPropagation(); setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1)); }}
              className="p-1 hover:bg-slate-700 dark:hover:bg-slate-800 rounded transition-colors"
            >
              <ChevronLeft size={16} />
            </button>
            <div className="text-[10px] font-black uppercase tracking-widest">
              {months[viewDate.getMonth()]} {viewDate.getFullYear()}
            </div>
            <button 
              type="button"
              onClick={(e) => { e.stopPropagation(); setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1)); }}
              className="p-1 hover:bg-slate-700 dark:hover:bg-slate-800 rounded transition-colors"
            >
              <ChevronRight size={16} />
            </button>
          </div>
          <div className="p-3">
            <div className="grid grid-cols-7 mb-1">
              {['D','S','T','Q','Q','S','S'].map(d => (
                <div key={d} className="text-[8px] font-black text-slate-400 dark:text-slate-500 text-center uppercase">{d}</div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-px bg-slate-100 dark:bg-slate-700 border border-slate-100 dark:border-slate-700">
              {renderCalendar()}
            </div>
          </div>
          <div className="p-3 bg-slate-50 dark:bg-slate-900/50 border-t border-slate-100 dark:border-slate-700 flex items-center justify-between">
             <button 
                type="button"
                onClick={() => setIsOpen(false)}
                className="text-[9px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
             >
               Fechar
             </button>
             <button 
                type="button"
                onClick={() => setIsOpen(false)}
                className="w-10 h-10 bg-indigo-600 dark:bg-indigo-500 text-white flex items-center justify-center hover:bg-slate-900 dark:hover:bg-indigo-600 transition-all shadow-md"
                title="Confirmar"
             >
               <Check size={18} />
             </button>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};
