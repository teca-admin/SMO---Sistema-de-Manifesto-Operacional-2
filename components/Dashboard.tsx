import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Manifesto, User as UserType } from '../types';
import { CustomDateTimePicker } from './CustomDateTimePicker';
import { CustomSelect } from './CustomSelect';
import { Search, History, Edit3, XCircle, CheckSquare, Plus, Database, Filter, Edit, ChevronDown, ChevronUp, Archive, User as UserIcon, LogOut, Loader2, Lock, KeyRound } from 'lucide-react';
import { supabase } from '../supabaseClient';

interface DashboardProps {
  manifestos: Manifesto[];
  onSave: (m: any, operatorName: string) => void;
  onAction: (action: string, id: string) => void;
  openHistory: (id: string) => void;
  openEdit: (id: string) => void;
  onOpenReprFill: (id: string) => void;
  onShowAlert: (type: 'success' | 'error', msg: string) => void;
  nextId: string;
  onOperatorChange?: (name: string | null) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ 
  manifestos, onSave, onAction, openHistory, openEdit, onOpenReprFill, onShowAlert, onOperatorChange
}) => {
  const [activeProfile, setActiveProfile] = useState<UserType | null>(() => {
    const saved = localStorage.getItem('smo_active_profile');
    try {
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  
  const [loginId, setLoginId] = useState('');
  const [loginPass, setLoginPass] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const [formData, setFormData] = useState({ 
    cia: '', 
    dataHoraPuxado: '', 
    dataHoraRecebido: ''
  });
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const [menuPos, setMenuPos] = useState({ top: 0, left: 0, openUpward: false });
  const [showHistory, setShowHistory] = useState(false);
  const [historyFilter, setHistoryFilter] = useState('');

  useEffect(() => {
    if (onOperatorChange) {
      onOperatorChange(activeProfile ? activeProfile.Nome_Completo : null);
    }
    if (activeProfile) {
      localStorage.setItem('smo_active_profile', JSON.stringify(activeProfile));
    } else {
      localStorage.removeItem('smo_active_profile');
    }
  }, [activeProfile, onOperatorChange]);

  const handleLogin = async () => {
    const cleanedUser = loginId.trim();
    const cleanedPass = loginPass.trim();

    if (!cleanedUser || !cleanedPass) {
      onShowAlert('error', 'Preencha todos os campos');
      return;
    }

    setIsLoggingIn(true);
    try {
      const { data, error } = await supabase
        .from('Cadastro_de_Perfil')
        .select('*')
        .ilike('Usuario', cleanedUser)
        .eq('Senha', cleanedPass)
        .single();
      
      if (error) {
        onShowAlert('error', 'Credenciais Inválidas ou Erro de Conexão');
      } else {
        setActiveProfile(data);
        onShowAlert('success', `Bem-vindo, ${data.Nome_Completo}`);
      }
    } catch (err) {
      onShowAlert('error', 'Falha crítica ao tentar autenticar');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = () => {
    setActiveProfile(null);
    setLoginId('');
    setLoginPass('');
    localStorage.removeItem('smo_active_profile');
  };

  const handleOpenMenu = (e: React.MouseEvent, id: string) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const menuSafeHeight = 300; 
    const viewportHeight = window.innerHeight;
    const spaceBelow = viewportHeight - rect.bottom;
    const shouldOpenUpward = spaceBelow < menuSafeHeight;
    
    setMenuPos({ 
      top: shouldOpenUpward ? rect.top - 12 : rect.bottom + 12, 
      left: Math.max(12, rect.left - 180),
      openUpward: shouldOpenUpward
    });
    setMenuOpenId(id);
  };

  const manifestosEmAndamento = manifestos.filter(m => 
    m.status !== 'Manifesto Entregue' && m.status !== 'Manifesto Cancelado'
  );

  const allHistory = manifestos.filter(m => 
    m.status === 'Manifesto Entregue' || m.status === 'Manifesto Cancelado'
  );

  const formatDisplayDate = (isoStr: string | undefined) => {
    if (!isoStr || isoStr === '---' || isoStr === '') return '---';
    try {
      const d = new Date(isoStr);
      if (isNaN(d.getTime())) return isoStr;
      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const year = d.getFullYear();
      const hours = String(d.getHours()).padStart(2, '0');
      const minutes = String(d.getMinutes()).padStart(2, '0');
      return `${day}/${month}/${year} ${hours}:${minutes}`;
    } catch (e) {
      return isoStr;
    }
  };

  const filteredHistory = allHistory.filter(m => {
    const search = historyFilter.toLowerCase();
    const puxado = formatDisplayDate(m.dataHoraPuxado).toLowerCase();
    const recebido = formatDisplayDate(m.dataHoraRecebido).toLowerCase();
    const entregue = formatDisplayDate(m.dataHoraEntregue).toLowerCase();
    const repr = formatDisplayDate(m.dataHoraRepresentanteCIA).toLowerCase();

    return (
      m.id.toLowerCase().includes(search) ||
      m.cia.toLowerCase().includes(search) ||
      m.status.toLowerCase().includes(search) ||
      (m.turno && m.turno.toLowerCase().includes(search)) ||
      puxado.includes(search) ||
      recebido.includes(search) ||
      entregue.includes(search) ||
      repr.includes(search)
    );
  }).slice(0, 100);

  const getStatusClass = (status: string) => {
    switch (status) {
      case 'Manifesto Recebido': return 'bg-blue-50 text-blue-600 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800/50';
      case 'Manifesto Iniciado': return 'bg-amber-50 text-amber-600 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800/50';
      case 'Manifesto Finalizado': return 'bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800/50';
      case 'Manifesto Entregue': return 'bg-slate-100 text-slate-500 border-slate-200 opacity-75 dark:bg-slate-700/50 dark:text-slate-400 dark:border-slate-600/50';
      case 'Manifesto Cancelado': return 'bg-red-50 text-red-600 border-red-200 opacity-75 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800/50';
      default: return 'bg-indigo-50 text-indigo-600 border-indigo-200 dark:bg-indigo-900/20 dark:text-indigo-400 dark:border-indigo-800/50';
    }
  };

  const renderTable = (data: Manifesto[], isHistory: boolean = false) => {
    const activeHeaders = ['ID Operacional', 'Status Atual', 'Companhia', 'Puxado', 'Receivado', 'Repr. CIA', 'Turno', 'Ação'];
    const activeWidths = ['14%', '16%', '11%', '14%', '14%', '14%', '9%', '8%'];
    const historyHeaders = ['ID Operacional', 'Status Atual', 'Companhia', 'Puxado', 'Recebido', 'Repr. CIA', 'Entregue', 'Turno', 'Ação'];
    const historyWidths = ['12%', '14%', '9%', '12%', '12%', '12%', '12%', '9%', '8%'];
    const headers = isHistory ? historyHeaders : activeHeaders;
    const columnWidths = isHistory ? historyWidths : activeWidths;

    return (
      <div className="overflow-x-auto">
        <table className="w-full border-collapse table-fixed">
          <thead>
            <tr className={`${isHistory ? 'bg-slate-200 dark:bg-slate-900' : 'bg-slate-100/50 dark:bg-slate-900/50'} border-b border-slate-200 dark:border-slate-700`}>
              {headers.map((h, idx, arr) => (
                <th 
                  key={h} 
                  style={{ width: columnWidths[idx] }}
                  className={`${idx === arr.length - 1 ? 'text-right' : 'text-left'} py-3 px-5 text-[9px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider whitespace-nowrap overflow-hidden text-ellipsis`}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-700 bg-white dark:bg-slate-800">
            {data.length === 0 ? (
              <tr>
                <td colSpan={isHistory ? 9 : 8} className="py-12 text-center text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase italic">
                  Nenhum manifesto registrado.
                </td>
              </tr>
            ) : (
              data.map(m => {
                const canFillRepr = m.status === 'Manifesto Finalizado';
                const hasReprDate = m.dataHoraRepresentanteCIA && m.dataHoraRepresentanteCIA !== '---' && m.dataHoraRepresentanteCIA !== '';
                return (
                  <tr key={m.id} className={`group hover:bg-indigo-50/40 dark:hover:bg-indigo-900/10 transition-colors ${isHistory ? 'opacity-70 grayscale-[0.2]' : ''}`}>
                    <td className="py-3 px-5 text-xs font-bold text-slate-900 dark:text-slate-100 font-mono-tech tracking-tighter whitespace-nowrap overflow-hidden text-ellipsis">{m.id}</td>
                    <td className="py-3 px-5 whitespace-nowrap overflow-hidden">
                      <span className={`px-2.5 py-1 border text-[9px] font-black uppercase tracking-tight inline-block ${getStatusClass(m.status)}`}>
                        {m.status}
                      </span>
                    </td>
                    <td className="py-3 px-5 text-[10px] font-black text-slate-600 dark:text-slate-300 uppercase tracking-tighter whitespace-nowrap overflow-hidden text-ellipsis">{m.cia}</td>
                    <td className="py-3 px-5 text-[10px] font-bold text-slate-500 dark:text-slate-400 font-mono-tech tracking-tight whitespace-nowrap overflow-hidden text-ellipsis">{formatDisplayDate(m.dataHoraPuxado)}</td>
                    <td className="py-3 px-5 text-[10px] font-bold text-slate-500 dark:text-slate-400 font-mono-tech tracking-tight whitespace-nowrap overflow-hidden text-ellipsis">{formatDisplayDate(m.dataHoraRecebido)}</td>
                    <td onClick={() => !isHistory && canFillRepr && onOpenReprFill(m.id)} className={`py-3 px-5 transition-all overflow-hidden text-ellipsis ${!isHistory && canFillRepr ? 'cursor-pointer hover:bg-indigo-100/60 dark:hover:bg-indigo-900/30' : ''}`}>
                      <div className={`flex items-center gap-1.5 text-[10px] font-mono-tech tracking-tight whitespace-nowrap ${!isHistory && canFillRepr ? 'text-indigo-600 dark:text-indigo-400 font-black' : 'text-slate-500 dark:text-slate-400 font-bold'}`}>
                        {formatDisplayDate(m.dataHoraRepresentanteCIA)}
                        {!isHistory && canFillRepr && !hasReprDate && <Edit size={10} className="text-indigo-400 animate-pulse" />}
                      </div>
                    </td>
                    {isHistory && (
                      <td className="py-3 px-5 text-[10px] font-bold font-mono-tech tracking-tight whitespace-nowrap overflow-hidden text-ellipsis text-emerald-600 dark:text-emerald-400">{formatDisplayDate(m.dataHoraEntregue)}</td>
                    )}
                    <td className="py-3 px-5 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase whitespace-nowrap overflow-hidden text-ellipsis">{m.turno}</td>
                    <td className="py-3 px-5 text-right">
                      <button onClick={(e) => handleOpenMenu(e, m.id)} className="p-1.5 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/30 transition-all border border-transparent hover:border-indigo-200 dark:hover:border-indigo-800">
                        <History size={16} />
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    );
  };

  if (!activeProfile) {
    return (
      <div className="max-w-md mx-auto mt-20 animate-fadeIn">
        <div className="bg-white dark:bg-slate-800 border-2 border-slate-900 dark:border-slate-700 shadow-[0_30px_60px_-12px_rgba(0,0,0,0.25)] p-10 flex flex-col items-center text-center relative">
          <div className="absolute top-0 left-0 w-full h-1 bg-indigo-600"></div>
          <div className="p-5 bg-slate-900 dark:bg-slate-700 mb-8 rounded-full border-4 border-slate-100 dark:border-slate-600">
            <UserIcon size={36} className="text-white" />
          </div>
          <h2 className="text-xl font-black uppercase tracking-[0.2em] text-slate-900 dark:text-white mb-2">Terminal de Cadastro</h2>
          <p className="text-[10px] font-bold text-slate-400 uppercase mb-10 tracking-widest">Identifique-se para gerenciar monitoramentos</p>
          <div className="w-full space-y-4">
            <div className="relative">
              <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input type="text" placeholder="USUÁRIO" value={loginId} onChange={(e) => setLoginId(e.target.value)} className="w-full h-14 pl-12 pr-4 bg-slate-50 dark:bg-slate-900/50 border-2 border-slate-200 dark:border-slate-700 text-xs font-black uppercase tracking-[0.1em] outline-none focus:border-indigo-600 dark:focus:border-indigo-500 dark:text-white focus:bg-white dark:focus:bg-slate-900 transition-all" />
            </div>
            <div className="relative">
              <KeyRound className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input type="password" placeholder="SENHA" value={loginPass} onChange={(e) => setLoginPass(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleLogin()} className="w-full h-14 pl-12 pr-4 bg-slate-50 dark:bg-slate-900/50 border-2 border-slate-200 dark:border-slate-700 text-xs font-black uppercase tracking-[0.1em] outline-none focus:border-indigo-600 dark:focus:border-indigo-500 dark:text-white focus:bg-white dark:focus:bg-slate-900 transition-all" />
            </div>
            <button onClick={handleLogin} disabled={isLoggingIn} className="w-full h-14 bg-slate-900 dark:bg-indigo-600 hover:bg-indigo-700 text-white font-black text-[11px] uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-3 shadow-xl">{isLoggingIn ? <Loader2 className="animate-spin" size={18} /> : 'Acessar Terminal'}</button>
          </div>
          <div className="mt-12 flex items-center gap-2 text-slate-300 dark:text-slate-600">
             <div className="h-px w-8 bg-slate-200 dark:bg-slate-700"></div>
             <span className="text-[8px] font-black uppercase tracking-widest">SMO Command Center v2.5</span>
             <div className="h-px w-8 bg-slate-200 dark:bg-slate-700"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 animate-fadeIn">
      <div className="bg-[#0f172a] dark:bg-[#020617] border-2 border-slate-800 dark:border-slate-900 p-4 flex flex-col md:flex-row items-center justify-between shadow-xl">
        <div className="flex items-center gap-4">
           <div className="w-10 h-10 bg-indigo-600 flex items-center justify-center text-sm font-black text-white rounded">
             {activeProfile.Nome_Completo.charAt(0)}
           </div>
           <div>
              <p className="text-[8px] font-black text-indigo-400 uppercase tracking-widest mb-0.5">Operador de Cadastro</p>
              <h2 className="text-sm font-black text-white uppercase tracking-tight">{activeProfile.Nome_Completo}</h2>
           </div>
        </div>
        <button onClick={handleLogout} className="h-8 px-4 bg-red-600/10 hover:bg-red-600 border border-red-600/30 hover:border-red-600 text-red-500 hover:text-white text-[9px] font-black uppercase tracking-widest transition-all flex items-center gap-2">
          <LogOut size={12} /> Sair do Terminal
        </button>
      </div>

      <div className="bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 panel-shadow">
        <div className="bg-slate-50 dark:bg-slate-900/50 px-5 py-2.5 border-b-2 border-slate-200 dark:border-slate-700 flex items-center justify-between">
          <h3 className="text-[10px] font-black text-slate-600 dark:text-slate-300 uppercase tracking-[0.2em] flex items-center gap-2">
            <span className="flex items-center justify-center w-5 h-5 bg-indigo-600 text-white rounded-sm"><Plus size={12} /></span>
            Registro de Novo Manifesto
          </h3>
          <span className="text-[9px] font-bold text-slate-400 uppercase">Input Terminal v2.5</span>
        </div>
        <div className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
            <div className="space-y-1.5">
              <label className="text-[9px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-tighter">Companhia Aérea</label>
              <CustomSelect value={formData.cia} onChange={v => setFormData({...formData, cia: v})} />
            </div>
            <div className="space-y-1.5">
              <label className="text-[9px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-tighter">Manifesto Puxado</label>
              <CustomDateTimePicker value={formData.dataHoraPuxado} onChange={v => setFormData({...formData, dataHoraPuxado: v})} />
            </div>
            <div className="space-y-1.5">
              <label className="text-[9px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-tighter">Manifesto Recebido</label>
              <CustomDateTimePicker value={formData.dataHoraRecebido} onChange={v => setFormData({...formData, dataHoraRecebido: v})} />
            </div>
            <div>
              <button onClick={() => { if (!formData.cia || !formData.dataHoraPuxado) return onShowAlert('error', 'Campos Obrigatórios Pendentes'); onSave(formData, activeProfile.Nome_Completo); setFormData({ cia: '', dataHoraPuxado: '', dataHoraRecebido: '' }); }} className="w-full h-10 bg-[#0f172a] dark:bg-indigo-600 hover:bg-indigo-700 text-white font-black text-[10px] uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-2 group shadow-lg">Confirmar Registro</button>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 panel-shadow overflow-hidden">
        <div className="bg-[#0f172a] dark:bg-slate-900 px-5 py-3 border-b-2 border-slate-900 dark:border-slate-700 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h3 className="text-[10px] font-black text-white uppercase tracking-[0.2em] flex items-center gap-2">
              <Database size={14} className="text-indigo-400" /> Base de Dados Operacional
            </h3>
            <div className="h-4 w-[1px] bg-slate-700" />
            <div className="flex items-center gap-1.5">
              <Filter size={12} className="text-slate-400" />
              <span className="text-[9px] font-bold text-slate-400 uppercase">Filtros: Em Andamento</span>
            </div>
          </div>
          <span className="text-[9px] font-bold text-slate-500 uppercase">Monitorando: {manifestosEmAndamento.length} Itens</span>
        </div>
        {renderTable(manifestosEmAndamento, false)}
      </div>

      <div className="bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 panel-shadow overflow-hidden">
        <div onClick={() => setShowHistory(!showHistory)} className="w-full bg-slate-50 dark:bg-slate-900/50 px-5 py-3 border-b-2 border-slate-200 dark:border-slate-700 flex flex-col md:flex-row items-center justify-between gap-4 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
          <div className="flex items-center gap-4">
            <h3 className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
              <Archive size={14} className="text-slate-400" /> Arquivo de Manifestos Concluídos
            </h3>
            <div className="h-4 w-[1px] bg-slate-300 dark:bg-slate-600" />
            <span className="text-[9px] font-bold text-slate-400 uppercase italic">Processados: {allHistory.length}</span>
          </div>
          <div className="flex items-center gap-4 w-full md:w-auto">
            {showHistory && (
              <div className="relative w-full md:w-80" onClick={e => e.stopPropagation()}>
                 <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                 <input type="text" value={historyFilter} onChange={e => setHistoryFilter(e.target.value)} placeholder="BUSCAR NO ARQUIVO..." className="w-full h-8 pl-10 pr-4 bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-700 text-[10px] font-black uppercase outline-none focus:border-indigo-500 transition-all dark:text-white" />
              </div>
            )}
            <div className="text-slate-400">{showHistory ? <ChevronUp size={18} /> : <ChevronDown size={18} />}</div>
          </div>
        </div>
        {showHistory && <div className="max-h-[400px] overflow-y-auto custom-scrollbar">{renderTable(filteredHistory, true)}</div>}
      </div>

      {menuOpenId && createPortal(
         <div className="fixed inset-0 z-[9998]" onClick={() => setMenuOpenId(null)}>
            <div className="fixed bg-white dark:bg-slate-800 border-2 border-slate-800 dark:border-slate-700 shadow-2xl min-w-[240px] py-1.5 animate-fadeIn" style={{ top: `${menuPos.top}px`, left: `${menuPos.left}px`, transform: menuPos.openUpward ? 'translateY(-100%)' : 'none' }} onClick={e => e.stopPropagation()}>
              <div className="px-4 py-1 border-b border-slate-100 dark:border-slate-700 mb-1">
                 <p className="text-[8px] font-black text-slate-400 uppercase">Ações Rápidas</p>
              </div>
              <button onClick={() => { openHistory(menuOpenId); setMenuOpenId(null); }} className="flex items-center gap-3 w-full px-4 py-2.5 text-left hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-[10px] font-black uppercase tracking-widest transition-colors"><Search size={14} className="text-slate-400"/> Detalhes / Log</button>
              {(() => {
                const targetM = manifestos.find(m => m.id === menuOpenId);
                const isHistoryItem = allHistory.some(hm => hm.id === menuOpenId);
                const hasSignature = targetM?.dataHoraRepresentanteCIA && targetM.dataHoraRepresentanteCIA !== '---' && targetM.dataHoraRepresentanteCIA !== '';
                const isEditable = targetM?.status === 'Manifesto Recebido';
                if (isHistoryItem) return null;
                return (
                  <>
                    {hasSignature ? (
                      <button onClick={() => { onAction('entregar', menuOpenId); setMenuOpenId(null); }} className="flex items-center gap-3 w-full px-4 py-2.5 text-left hover:bg-emerald-50 dark:hover:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 text-[10px] font-black uppercase tracking-widest transition-colors"><CheckSquare size={14} className="text-emerald-400"/> ENTREGAR MANIFESTO</button>
                    ) : (
                      <div className="flex items-center gap-3 w-full px-4 py-2.5 text-left text-slate-300 dark:text-slate-600 text-[10px] font-black uppercase tracking-widest cursor-not-allowed group relative"><Lock size={14} className="text-slate-200 dark:text-slate-700"/> <span>Entregar (Bloqueado)</span></div>
                    )}
                    {isEditable ? (
                      <button onClick={() => { openEdit(menuOpenId); setMenuOpenId(null); }} className="flex items-center gap-3 w-full px-4 py-2.5 text-left hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-[10px] font-black uppercase tracking-widest transition-colors"><Edit3 size={14} className="text-indigo-400"/> Editar Registro</button>
                    ) : (
                      <div className="flex items-center gap-3 w-full px-4 py-2.5 text-left text-slate-300 dark:text-slate-600 text-[10px] font-black uppercase tracking-widest cursor-not-allowed group relative"><Lock size={14} className="text-slate-200 dark:text-slate-700"/> <span>Editar (Bloqueado)</span></div>
                    )}
                    <button onClick={() => { onAction('cancelar', menuOpenId); setMenuOpenId(null); }} className="flex items-center gap-3 w-full px-4 py-2.5 text-left hover:bg-red-50 dark:hover:bg-red-900/20 text-red-700 dark:text-red-400 text-[10px] font-black uppercase tracking-widest transition-colors"><XCircle size={14} className="text-red-400"/> Cancelar Item</button>
                  </>
                );
              })()}
            </div>
         </div>,
         document.body
      )}
    </div>
  );
};