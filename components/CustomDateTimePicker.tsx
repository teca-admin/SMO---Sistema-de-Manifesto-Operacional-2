
import React, { useState, useEffect, useRef } from 'react';
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
  const [coords, setCoords] = useState({ top: 0, left: 0 });

  // Sincroniza valor externo (ISO string) com o input visual
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

  // Calcula posição do popover (Portal)
  useEffect(() => {
    if (isOpen && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      setCoords({ top: rect.bottom + window.scrollY, left: rect.left });
    }
  }, [isOpen]);

  const daysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();

  // Função para processar entrada manual com máscara estrita
  const handleManualInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value.replace(/\D/g, ""); // Remove tudo que não for número
    
    // Limita a 12 dígitos (DDMMYYYYHHMM)
    if (val.length > 12) val = val.slice(0, 12);

    let formatted = "";
    if (val.length > 0) {
      // Dia
      formatted = val.substring(0, 2);
      if (val.length > 2) {
        // Mês
        formatted += "/" + val.substring(2, 4);
        if (val.length > 4) {
          // Ano
          formatted += "/" + val.substring(4, 8);
          if (val.length > 8) {
            // Hora
            formatted += " " + val.substring(8, 10);
            if (val.length > 10) {
              // Minuto
              formatted += ":" + val.substring(10, 12);
            }
          }
        }
      }
    }

    setInputValue(formatted);

    // Se estiver completo, tenta validar e disparar o onChange
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
                ? 'bg-indigo-50 border-indigo-200 text-indigo-600 hover:bg-indigo-100'
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
              ? 'bg-slate-100 text-slate-400 border-slate-200' 
              : isOpen 
                ? 'bg-white border-indigo-600 text-slate-900' 
                : 'bg-slate-50 border-slate-200 text-slate-800 hover:border-slate-300 focus:bg-white focus:border-indigo-600'
          }`}
        />
        <CalendarIcon 
          size={14} 
          onClick={() => !disabled && setIsOpen(!isOpen)}
          className={`absolute right-3 top-1/2 -translate-y-1/2 transition-colors cursor-pointer ${isOpen ? 'text-indigo-600' : 'text-slate-400'}`} 
        />
      </div>

      {isOpen && createPortal(
        <div 
          className="fixed z-[10050] bg-white border-2 border-slate-800 shadow-2xl flex flex-col w-[280px] animate-fadeIn"
          style={{ top: coords.top + 4, left: coords.left }}
        >
          {/* Header Calendário */}
          <div className="bg-slate-900 text-white p-3 flex items-center justify-between">
            <button 
              type="button"
              onClick={(e) => { e.stopPropagation(); setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1)); }}
              className="p-1 hover:bg-slate-700 rounded transition-colors"
            >
              <ChevronLeft size={16} />
            </button>
            <div className="text-[10px] font-black uppercase tracking-widest">
              {months[viewDate.getMonth()]} {viewDate.getFullYear()}
            </div>
            <button 
              type="button"
              onClick={(e) => { e.stopPropagation(); setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1)); }}
              className="p-1 hover:bg-slate-700 rounded transition-colors"
            >
              <ChevronRight size={16} />
            </button>
          </div>

          {/* Grid de Dias */}
          <div className="p-3">
            <div className="grid grid-cols-7 mb-1">
              {['D','S','T','Q','Q','S','S'].map(d => (
                <div key={d} className="text-[8px] font-black text-slate-400 text-center uppercase">{d}</div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-px bg-slate-100 border border-slate-100">
              {renderCalendar()}
            </div>
          </div>

          {/* Footer com botão de confirmação */}
          <div className="p-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
             <button 
                type="button"
                onClick={() => setIsOpen(false)}
                className="text-[9px] font-black uppercase tracking-widest text-slate-400 hover:text-indigo-600 transition-colors"
             >
               Fechar Calendário
             </button>
             
             <button 
                type="button"
                onClick={() => setIsOpen(false)}
                className="w-10 h-10 bg-indigo-600 text-white flex items-center justify-center hover:bg-slate-900 transition-all shadow-md"
                title="Confirmar escolha"
             >
               <Check size={18} />
             </button>
          </div>
          
          <div className="fixed inset-0 z-[-1]" onClick={() => setIsOpen(false)}></div>
        </div>,
        document.body
      )}
    </div>
  );
};
