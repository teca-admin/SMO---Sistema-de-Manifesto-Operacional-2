
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Check } from 'lucide-react';
import { CIAS } from '../types';

interface Option {
  label: string;
  value: string;
}

interface CustomSelectProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  options?: Option[]; // Permite passar opções customizadas (ex: "Todas")
}

export const CustomSelect: React.FC<CustomSelectProps> = ({ 
  value, 
  onChange, 
  placeholder = "SELECIONE...",
  disabled = false,
  options
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const [coords, setCoords] = useState({ top: -9999, left: -9999, width: 0 });

  const selectOptions = options || CIAS.map(cia => ({ label: cia.toUpperCase(), value: cia }));

  const updateCoords = useCallback(() => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      setCoords({ top: rect.bottom, left: rect.left, width: rect.width });
    }
  }, []);

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

  const currentLabel = selectOptions.find(o => o.value === value)?.label || placeholder;

  return (
    <div className="relative w-full" ref={containerRef}>
      <div 
        className={`h-10 px-3 border-2 flex items-center justify-between text-[11px] font-black font-mono-tech transition-all cursor-pointer shadow-sm ${
          disabled 
            ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-600 border-slate-200 dark:border-slate-800' 
            : isOpen 
              ? 'bg-white dark:bg-slate-900 border-indigo-600 dark:border-indigo-500 text-slate-900 dark:text-white' 
              : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 hover:border-slate-300 dark:hover:border-slate-600'
        }`}
        onClick={() => !disabled && setIsOpen(!isOpen)}
      >
        <span className="uppercase tracking-tighter truncate pr-2">{currentLabel}</span>
        <ChevronDown size={14} className={`text-slate-400 transition-transform shrink-0 ${isOpen ? 'rotate-180' : ''}`} />
      </div>

      {isOpen && createPortal(
        <div 
          className="fixed z-[10050] bg-white dark:bg-slate-900 border-2 border-slate-900 dark:border-slate-700 shadow-[0_20px_50px_rgba(0,0,0,0.3)] overflow-hidden animate-fadeIn"
          style={{ 
            top: coords.top + 4, 
            left: coords.left, 
            width: coords.width, 
            visibility: coords.top === -9999 ? 'hidden' : 'visible'
          }} 
        >
          <div className="max-h-[280px] overflow-y-auto custom-scrollbar">
            {selectOptions.map(option => (
              <div 
                key={option.value}
                onClick={() => { onChange(option.value); setIsOpen(false); }}
                className={`px-4 py-2.5 text-[10px] font-black uppercase tracking-widest cursor-pointer transition-colors flex items-center justify-between group ${
                  value === option.value 
                    ? 'bg-indigo-600 text-white' 
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}
              >
                <span>{option.label}</span>
                {value === option.value && <Check size={12} className="text-white" />}
              </div>
            ))}
          </div>
        </div>,
        document.body
      )}
      
      {/* Overlay para fechar ao clicar fora */}
      {isOpen && createPortal(
        <div className="fixed inset-0 z-[10049]" onClick={() => setIsOpen(false)} />,
        document.body
      )}
    </div>
  );
};
