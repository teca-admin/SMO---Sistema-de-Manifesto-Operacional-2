import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Manifesto, User as UserType } from '../types';
import { CustomDateTimePicker } from './CustomDateTimePicker';
import { CustomSelect } from './CustomSelect';
import { 
  Search, History, Edit3, XCircle, CheckSquare, Plus, Database, Filter, Edit, 
  ChevronDown, ChevronUp, Archive, User as UserIcon, LogOut, Loader2, Lock, 
  KeyRound, Eye, EyeOff, AlertOctagon, HelpCircle
} from 'lucide-react';
import { supabase } from '../supabaseClient';

// Função mestre de parse para garantir 05/02 = Fevereiro, SEMPRE.
const parseBRDate = (dateStr: string | undefined): Date | null => {
    if (!dateStr || dateStr === '---' || dateStr === '') return null;
    try {
      if (dateStr.includes('/')) {
        const parts = dateStr.split(/[\/\s,:]+/);
        if (parts.length >= 5) {
          const day = parseInt(parts[0], 10);
          const month = parseInt(parts[1], 10) - 1;
          const year = parseInt(parts[2], 10);
          const hour = parseInt(parts[3], 10);
          const minute = parseInt(parts[4], 10);
          const second = parts[5] ? parseInt(parts[5], 10) : 0;
          const d = new Date(year, month, day, hour, minute, second);
          if (!isNaN(d.getTime())) return d;
        }
      }
      const fallback = new Date(dateStr);
      return isNaN(fallback.getTime()) ? null : fallback;
    } catch { return null; }
};

const formatDisplayDate = (dateStr: string | undefined) => {
  if (!dateStr || dateStr === '---' || dateStr === '') return '---';
  const d = parseBRDate(dateStr);
  if (!d) return dateStr.replace(',', '');
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  return `${day}/${month}/${year} ${hours}:${minutes}`;
};

interface DashboardProps {
  manifestos: Manifesto[];
  activeUser: UserType | null;
  onSave: (m: any) => void;
  onAction: (action: string, id: string) => void;
  openHistory: (id: string) => void;
  openEdit: (id: string) => void;
  onOpenReprFill: (id: string) => void;
  onShowAlert: (type: 'success' | 'error', msg: string) => void;
  nextId: string;
  onLogout: () => void;
  onOperatorChange?: (profile: UserType | null) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ 
  manifestos, activeUser, onSave, onAction, openHistory, openEdit, onOpenReprFill, onShowAlert, onLogout, onOperatorChange
}) => {
  const [loginId, setLoginId] = useState('');
  const [loginPass, setLoginPass] = useState('');
  const [showPass, setShowPass] = useState(false);
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
  const [showPuxadoInfo, setShowPuxadoInfo] = useState(false);
  const [showRecebidoInfo, setShowRecebidoInfo] = useState(false);

  const dateInconsistency = useMemo(() => {
    if (formData.dataHoraPuxado && formData.dataHoraRecebido) {
      const pux = parseBRDate(formData.dataHoraPuxado);
      const rec = parseBRDate(formData.dataHoraRecebido);
      if (pux && rec) {
        pux.setSeconds(0, 0);
        rec.setSeconds(0, 0);
        const diffMs = rec.getTime() - pux.getTime();
        return diffMs < 60000;
      }
    }
    return false;
  }, [formData.dataHoraPuxado, formData.dataHoraRecebido]);

  const handleLogin = async () => {
    const cleanedUser = loginId.trim();
    const cleanedPass = loginPass.trim();

    if (!cleanedUser || !cleanedPass) {
      onShowAlert('error', 'Preencha todos os campos');
      return;
    }

    setIsLoggingIn(true);
    try {
      // Alterado para .eq para garantir distinção de maiúsculas/minúsculas
      const { data, error } = await supabase
        .from('Cadastro_de_Perfil')
        .select('*')
        .eq('Usuario', cleanedUser)
        .eq('Senha', cleanedPass)
        .single();
      
      if (error) {
        onShowAlert('error', 'Credenciais Inválidas');
      } else {
        const sessionId = crypto.randomUUID();
        const nowBR = new Date().toLocaleString('pt-BR');
        
        const { error: updateError } = await supabase
          .from('Cadastro_de_Perfil')
          .update({ sesson_id: sessionId, "Session_Data/HR": nowBR })
          .eq('id', data.id);

        if (updateError) throw updateError;
        if (onOperatorChange) onOperatorChange({ ...data, sesson_id: sessionId });
        onShowAlert('success', `Bem-vindo, ${data.Nome_Completo}`);
      }
    } catch (err) {
      onShowAlert('error', 'Falha crítica ao autenticar');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleManualLogout = () => {
    onLogout();
    setLoginId('');
    setLoginPass('');
    setShowPass(false);
  };

  const handleOpenMenu = (e: React.MouseEvent, id: string) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const shouldOpenUpward = (window.innerHeight - rect.bottom) < 300;
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

  const allHistory = manifestos
    .filter(m => m.status === 'Manifesto Entregue' || m.status === 'Manifesto Cancelado')
    .sort((a, b) => {
      const dateA = parseBRDate(a.carimboDataHR);
      const dateB = parseBRDate(b.carimboDataHR);
      return (dateB?.getTime() || 0) - (dateA?.getTime() || 0);
    })
    .slice(0, 100);

  const filteredHistory = allHistory.filter(m => {
    const search = historyFilter.toLowerCase();
    return m.id.toLowerCase().includes(search) || m.cia.toLowerCase().includes(search) || m.status.toLowerCase().includes(search);
  });

  const getStatusClass = (status: string) => {
    switch (status) {
      case 'Manifesto Recebido': return 'bg-blue-50 text-blue-600 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400';
      case 'Manifesto Iniciado': return 'bg-amber-50 text-amber-600 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400';
      case 'Manifesto Finalizado': return 'bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400';
      case 'Manifesto Entregue': return 'bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400';
      case 'Manifesto Cancelado': return 'bg-red-50 text-red-600 border-red-200 opacity-75 dark:bg-red-900/20 dark:text-red-400';
      default: return 'bg-indigo-50 text-indigo-600 border-indigo-200 dark:bg-indigo-900/20 dark:text-indigo-400';
    }
  };

  const renderTable = (data: Manifesto[], isHistory: boolean = false) => {
    const headers = isHistory ? ['ID MANIFESTO', 'STATUS', 'CIA', 'PUXADO', 'RECEBIDO', 'REPRESENTANTE CIA', 'ENTREGUE', 'TURNO', 'AÇÃO'] : ['ID MANIFESTO', 'STATUS', 'CIA', 'PUXADO', 'RECEBIDO', 'REPRESENTANTE CIA', 'TURNO', 'AÇÃO'];
    const widths = isHistory ? ['9%', '11%', '11%', '11%', '11%', '11%', '11%', '11%', '9%'] : ['10%', '11%', '11%', '15%', '15%', '15%', '15%', '8%'];

    return (
      <div className="w-full overflow-hidden">
        <table className="w-full border-collapse table-fixed bg-white dark:bg-slate-800">
          <thead>
            <tr className={`${isHistory ? 'bg-slate-200 dark:bg-slate-900' : 'bg-slate-100/50 dark:bg-slate-900/50'} border-b border-slate-200 dark:border-slate-700`}>
              {headers.map((h, idx) => (
                <th key={idx} style={{ width: widths[idx] }} className="text-center py-3 px-3 text-[12px] font-black text-slate-800 dark:text-slate-300 uppercase tracking-tighter whitespace-nowrap overflow-hidden text-ellipsis">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
            {data.length === 0 ? (
              <tr><td colSpan={headers.length} className="py-12 text-center text-[12px] font-bold text-slate-400 dark:text-slate-500 uppercase italic">Nenhum manifesto registrado.</td></tr>
            ) : (
              data.map(m => (
                <tr key={m.id} className="group hover:bg-indigo-50/40 dark:hover:bg-indigo-900/10 transition-colors text-center">
                  <td className="py-3 px-3 text-[12px] font-bold text-slate-950 dark:text-slate-100 font-mono-tech tracking-tighter whitespace-nowrap overflow-hidden text-ellipsis">{m.id}</td>
                  <td className="py-3 px-3"><span className={`px-2 py-0.5 border text-[10px] font-black uppercase tracking-tighter inline-block ${getStatusClass(m.status)}`}>{m.status.replace('Manifesto ', '')}</span></td>
                  <td className="py-3 px-3 text-[12px] font-black text-slate-950 dark:text-slate-100 uppercase truncate">{m.cia}</td>
                  <td className="py-3 px-3 text-[12px] font-bold font-mono-tech truncate">{formatDisplayDate(m.dataHoraPuxado)}</td>
                  <td className="py-3 px-3 text-[12px] font-bold font-mono-tech truncate">{formatDisplayDate(m.dataHoraRecebido)}</td>
                  <td onClick={() => !isHistory && m.status === 'Manifesto Finalizado' && onOpenReprFill(m.id)} className={`py-3 px-3 text-[12px] font-bold font-mono-tech transition-all truncate ${!isHistory && m.status === 'Manifesto Finalizado' ? 'cursor-pointer hover:bg-indigo-100/60 dark:hover:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 font-black' : ''}`}>{formatDisplayDate(m.dataHoraRepresentanteCIA)}</td>
                  {isHistory && <td className="py-3 px-3 text-[12px] font-bold font-mono-tech text-emerald-600 dark:text-emerald-400 truncate">{formatDisplayDate(m.dataHoraEntregue)}</td>}
                  <td className="py-3 px-3 text-[12px] font-black truncate">{m.turno}</td>
                  <td className="py-3 px-3"><button onClick={(e) => handleOpenMenu(e, m.id)} className="p-1.5 text-slate-400 hover:text-indigo-600 transition-all border border-transparent hover:bg-indigo-100 rounded-sm"><History size={16} /></button></td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    );
  };

  if (!activeUser) {
    return (
      <div className="max-w-md mx-auto mt-20 animate-fadeIn">
        <div className="bg-white dark:bg-slate-800 border-2 border-slate-900 dark:border-slate-700 shadow-2xl p-10 flex flex-col items-center text-center relative">
          <div className="absolute top-0 left-0 w-full h-1 bg-indigo-600"></div>
          <div className="p-5 bg-slate-900 dark:bg-slate-700 mb-8 rounded-full border-4 border-slate-100"><UserIcon size={36} className="text-white" /></div>
          <h2 className="text-xl font-black uppercase tracking-[0.2em] mb-2">Terminal de Cadastro</h2>
          <p className="text-[10px] font-bold text-slate-400 uppercase mb-10 tracking-widest">Acesse sua conta operacional</p>
          <div className="w-full space-y-4">
            <div className="relative">
              <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input 
                type="text" 
                placeholder="USUÁRIO" 
                value={loginId} 
                onChange={(e) => setLoginId(e.target.value)} 
                className="w-full h-14 pl-12 pr-4 bg-slate-50 dark:bg-slate-900 border-2 border-slate-200 outline-none focus:border-indigo-600 transition-all font-black text-xs" 
              />
            </div>
            <div className="relative">
              <KeyRound className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input 
                type={showPass ? "text" : "password"} 
                placeholder="SENHA" 
                value={loginPass} 
                onChange={(e) => setLoginPass(e.target.value)} 
                onKeyDown={(e) => e.key === 'Enter' && handleLogin()} 
                className="w-full h-14 pl-12 pr-12 bg-slate-50 dark:bg-slate-900 border-2 border-slate-200 outline-none focus:border-indigo-600 transition-all font-black text-xs" 
              />
              <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400">
                {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            <button onClick={handleLogin} disabled={isLoggingIn} className="w-full h-14 bg-slate-900 dark:bg-indigo-600 hover:bg-indigo-700 text-white font-black text-[11px] uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-3 shadow-xl">
              {isLoggingIn ? <Loader2 className="animate-spin" size={18} /> : 'Acessar Terminal'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 animate-fadeIn">
      <div className="bg-[#0f172a] dark:bg-[#020617] border-2 border-slate-800 dark:border-slate-900 p-4 flex flex-col md:flex-row items-center justify-between shadow-xl">
        <div className="flex items-center gap-4">
           <div className="w-10 h-10 bg-indigo-600 flex items-center justify-center text-sm font-black text-white rounded">{activeUser.Nome_Completo.charAt(0)}</div>
           <div><p className="text-[8px] font-black text-indigo-400 uppercase tracking-widest mb-0.5">Operador de Cadastro</p><h2 className="text-sm font-black text-white uppercase tracking-tight">{activeUser.Nome_Completo}</h2></div>
        </div>
        <button onClick={handleManualLogout} className="h-8 px-4 bg-red-600/10 hover:bg-red-600 border border-red-600/30 text-red-500 hover:text-white text-[9px] font-black uppercase tracking-widest transition-all flex items-center gap-2"><LogOut size={12} /> Sair do Terminal</button>
      </div>

      <div className="bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 panel-shadow p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
          <div className="space-y-1.5"><label className="text-[12px] font-black text-slate-950 dark:text-slate-300 uppercase tracking-tighter">Companhia Aérea</label><CustomSelect value={formData.cia} onChange={v => setFormData({...formData, cia: v})} /></div>
          <div className="space-y-1.5 relative"><div className="flex items-center gap-2 mb-0.5"><label className="text-[12px] font-black text-slate-950 dark:text-slate-300 uppercase tracking-tighter">Manifesto Puxado</label><button type="button" onClick={() => setShowPuxadoInfo(!showPuxadoInfo)} className="text-slate-400"><HelpCircle size={14} /></button></div>{showPuxadoInfo && <div className="absolute bottom-full mb-2 bg-slate-900 text-white p-2 text-[10px] rounded shadow-xl z-50">Data/Hora de impressão na folha.</div>}<CustomDateTimePicker value={formData.dataHoraPuxado} onChange={v => setFormData({...formData, dataHoraPuxado: v})} /></div>
          <div className="space-y-1.5 relative"><div className="flex items-center gap-2 mb-0.5"><label className="text-[12px] font-black text-slate-950 dark:text-slate-300 uppercase tracking-tighter">Manifesto Recebido</label><button type="button" onClick={() => setShowRecebidoInfo(!showRecebidoInfo)} className="text-slate-400"><HelpCircle size={14} /></button></div>{showRecebidoInfo && <div className="absolute bottom-full mb-2 bg-slate-900 text-white p-2 text-[10px] rounded shadow-xl z-50">Data/Hora do carimbo da presença.</div>}<CustomDateTimePicker value={formData.dataHoraRecebido} onChange={v => setFormData({...formData, dataHoraRecebido: v})} /></div>
          <button disabled={dateInconsistency} onClick={() => { if (!formData.cia || !formData.dataHoraPuxado) return onShowAlert('error', 'Campos Obrigatórios Pendentes'); onSave(formData); setFormData({ cia: '', dataHoraPuxado: '', dataHoraRecebido: '' }); }} className={`w-full h-10 font-black text-[10px] uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-2 shadow-lg ${dateInconsistency ? 'bg-slate-300 text-slate-500 cursor-not-allowed' : 'bg-slate-900 dark:bg-indigo-600 text-white hover:bg-indigo-700'}`}>Confirmar Registro</button>
        </div>
        {dateInconsistency && <p className="text-[10px] font-black text-red-600 uppercase mt-2 italic">ERRO: O recebimento deve ser no mínimo 1 minuto após o puxe.</p>}
      </div>

      <div className="bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 panel-shadow overflow-hidden"><div className="bg-[#0f172a] px-5 py-3 flex items-center justify-between text-white"><h3 className="text-[10px] font-black uppercase tracking-[0.2em] flex items-center gap-2"><Database size={14} className="text-indigo-400" /> Base Operacional (Andamento)</h3><span>{manifestosEmAndamento.length} Itens</span></div>{renderTable(manifestosEmAndamento, false)}</div>
      
      <div className="bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 panel-shadow overflow-hidden">
        <div onClick={() => setShowHistory(!showHistory)} className="bg-slate-50 dark:bg-slate-900 px-5 py-3 flex items-center justify-between cursor-pointer hover:bg-slate-100 transition-colors border-b border-slate-200">
          <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Arquivo de Manifestos Concluídos</h3>
          <div className="flex items-center gap-4">{showHistory && <input type="text" value={historyFilter} onChange={e => setHistoryFilter(e.target.value)} onClick={e => e.stopPropagation()} placeholder="BUSCAR..." className="h-8 px-4 bg-white border border-slate-200 text-[10px] font-black uppercase outline-none focus:border-indigo-600" />}{showHistory ? <ChevronUp size={18} /> : <ChevronDown size={18} />}</div>
        </div>
        {showHistory && <div className="max-h-[400px] overflow-y-auto custom-scrollbar">{renderTable(filteredHistory, true)}</div>}
      </div>

      {menuOpenId && createPortal(
         <div className="fixed inset-0 z-[9998]" onClick={() => setMenuOpenId(null)}>
            <div className="fixed bg-white dark:bg-slate-800 border-2 border-slate-800 shadow-2xl min-w-[240px] py-2 animate-fadeIn" style={{ top: `${menuPos.top}px`, left: `${menuPos.left}px`, transform: menuPos.openUpward ? 'translateY(-100%)' : 'none' }} onClick={e => e.stopPropagation()}>
              <button onClick={() => { openHistory(menuOpenId); setMenuOpenId(null); }} className="flex items-center gap-3 w-full px-4 py-2.5 text-left hover:bg-slate-50 text-[10px] font-black uppercase transition-colors"><Search size={14} /> Detalhes / Log</button>
              {(() => {
                const m = manifestos.find(it => it.id === menuOpenId);
                const hasSignature = m?.dataHoraRepresentanteCIA && m.dataHoraRepresentanteCIA !== '---' && m.dataHoraRepresentanteCIA !== '';
                return (
                  <>
                    <button disabled={!hasSignature} onClick={() => { onAction('entregar', menuOpenId); setMenuOpenId(null); }} className={`flex items-center gap-3 w-full px-4 py-2.5 text-left text-[10px] font-black uppercase transition-colors ${hasSignature ? 'hover:bg-emerald-50 text-emerald-700' : 'opacity-30 cursor-not-allowed'}`}><CheckSquare size={14} /> Entregar</button>
                    <button disabled={m?.status !== 'Manifesto Recebido'} onClick={() => { openEdit(menuOpenId); setMenuOpenId(null); }} className={`flex items-center gap-3 w-full px-4 py-2.5 text-left text-[10px] font-black uppercase transition-colors ${m?.status === 'Manifesto Recebido' ? 'hover:bg-slate-50' : 'opacity-30 cursor-not-allowed'}`}><Edit3 size={14} /> Editar</button>
                    <button onClick={() => { onAction('cancelar', menuOpenId); setMenuOpenId(null); }} className="flex items-center gap-3 w-full px-4 py-2.5 text-left hover:bg-red-50 text-red-700 text-[10px] font-black uppercase transition-all"><XCircle size={14} /> Cancelar</button>
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
