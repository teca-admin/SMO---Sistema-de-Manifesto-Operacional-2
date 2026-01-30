
import React, { useState } from 'react';
import { Share2, Copy, Check, ExternalLink, Globe, ShieldAlert, Plane, LayoutDashboard } from 'lucide-react';
import { CIAS } from '../types';
import { CustomSelect } from './CustomSelect';

export const ExternalLinksPortal: React.FC = () => {
  const [selectedCia, setSelectedCia] = useState('');
  const [copiedLink, setCopiedLink] = useState<string | null>(null);

  const ciaOptions = [
    { label: "GERAL (TODAS CIAS)", value: "" },
    ...CIAS.map(c => ({ label: c.toUpperCase(), value: c }))
  ];

  const generateLink = (type: 'fluxo' | 'vinci') => {
    const url = new URL(window.location.origin + window.location.pathname);
    url.searchParams.set('view', type);
    if (selectedCia) {
      url.searchParams.set('cia', selectedCia);
    }
    return url.toString();
  };

  const handleCopy = (type: 'fluxo' | 'vinci') => {
    const link = generateLink(type);
    navigator.clipboard.writeText(link);
    setCopiedLink(type);
    setTimeout(() => setCopiedLink(null), 2000);
  };

  return (
    <div className="flex flex-col gap-6 animate-fadeIn">
      <div className="bg-[#0f172a] dark:bg-[#020617] border-2 border-slate-800 dark:border-slate-900 p-6 shadow-xl">
        <div className="flex items-center gap-4 mb-8">
          <div className="p-3 bg-pink-600 rounded shadow-lg">
            <Globe size={24} className="text-white" />
          </div>
          <div>
            <h2 className="text-lg font-black text-white uppercase tracking-[0.2em]">Portal de Acessos Externos</h2>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Gestão de links de visualização para parceiros e CIAs</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 p-6 flex flex-col gap-6">
            <h3 className="text-[12px] font-black text-slate-900 dark:text-white uppercase tracking-widest flex items-center gap-2 border-b border-slate-100 dark:border-slate-700 pb-4">
              <Share2 size={16} className="text-indigo-600" /> Configuração do Link
            </h3>
            
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase">Filtrar por Companhia (Opcional)</label>
              <CustomSelect 
                value={selectedCia} 
                onChange={setSelectedCia} 
                options={ciaOptions}
                placeholder="SELECIONE UMA CIA..."
              />
              <p className="text-[9px] text-slate-400 font-bold uppercase italic">
                * Links filtrados mostrarão apenas manifestos da CIA selecionada.
              </p>
            </div>
          </div>

          <div className="space-y-4">
            {/* Opção 1: Monitor de Fluxo (Público) */}
            <div className="bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 p-4 flex flex-col gap-4">
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 rounded">
                    <Plane size={18} />
                  </div>
                  <div>
                    <h4 className="text-[11px] font-black text-slate-900 dark:text-white uppercase">Monitor de Fluxo Live</h4>
                    <p className="text-[9px] font-bold text-slate-400 uppercase">Visão única (Kanban) para telões ou CIAs</p>
                  </div>
                </div>
                <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-900 text-[8px] font-black rounded uppercase text-slate-500 tracking-tighter">Public Link</span>
              </div>
              <div className="flex gap-2">
                <button 
                  onClick={() => handleCopy('fluxo')}
                  className="flex-1 h-10 bg-slate-900 dark:bg-indigo-600 hover:bg-slate-800 text-white text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all shadow-md"
                >
                  {copiedLink === 'fluxo' ? <Check size={14} /> : <Copy size={14} />}
                  {copiedLink === 'fluxo' ? 'Copiado!' : 'Copiar URL Fluxo'}
                </button>
                <a 
                  href={generateLink('fluxo')} 
                  target="_blank" 
                  rel="noreferrer"
                  className="w-12 h-10 border-2 border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-all"
                >
                  <ExternalLink size={18} />
                </a>
              </div>
            </div>

            {/* Opção 2: Dashboard Vinci (Auditoria) */}
            <div className="bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 p-4 flex flex-col gap-4">
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 dark:bg-blue-900/30 text-blue-600 rounded">
                    <LayoutDashboard size={18} />
                  </div>
                  <div>
                    <h4 className="text-[11px] font-black text-slate-900 dark:text-white uppercase">Dashboard Vinci Auditoria</h4>
                    <p className="text-[9px] font-bold text-slate-400 uppercase">3 Abas: Fluxo + Eficiência + Auditoria</p>
                  </div>
                </div>
                <span className="px-2 py-0.5 bg-blue-50 dark:bg-blue-900 text-[8px] font-black rounded uppercase text-blue-600 tracking-tighter">Admin Link</span>
              </div>
              <div className="flex gap-2">
                <button 
                  onClick={() => handleCopy('vinci')}
                  className="flex-1 h-10 bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all shadow-md"
                >
                  {copiedLink === 'vinci' ? <Check size={14} /> : <Copy size={14} />}
                  {copiedLink === 'vinci' ? 'Copiado!' : 'Copiar URL Dashboard'}
                </button>
                <a 
                  href={generateLink('vinci')} 
                  target="_blank" 
                  rel="noreferrer"
                  className="w-12 h-10 border-2 border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-400 hover:text-blue-600 transition-all"
                >
                  <ExternalLink size={18} />
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-amber-50 dark:bg-amber-900/10 border-l-4 border-amber-500 p-4 flex items-start gap-3">
        <ShieldAlert size={20} className="text-amber-600 shrink-0" />
        <div>
          <p className="text-[10px] font-black text-amber-800 dark:text-amber-400 uppercase tracking-widest mb-1">Aviso de Segurança</p>
          <p className="text-[10px] font-bold text-amber-700 dark:text-amber-500 uppercase leading-relaxed">
            Os links gerados neste portal permitem acesso direto às informações operacionais sem necessidade de senha manual. 
            Compartilhe apenas com representantes autorizados da CIA aérea ou equipe VINCI.
          </p>
        </div>
      </div>
    </div>
  );
};
