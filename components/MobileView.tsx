
import React, { useState } from 'react';
import { Manifesto, CIAS, User as UserType } from '../types';
import { 
  LayoutGrid, Columns, BarChart3, Sun, Moon, 
  Terminal, Activity, Plus, Database, History, 
  CheckCircle2, Box, Timer, ShieldAlert,
  ChevronRight, ArrowRight, User as UserIcon,
  KeyRound, Eye, EyeOff, Loader2, GraduationCap, ClipboardCheck
} from 'lucide-react';
import { supabase } from '../supabaseClient';
import { AssessmentGuide } from './AssessmentGuide';
import { SlaAuditor } from './SlaAuditor';
import { CustomSelect } from './CustomSelect';

interface MobileViewProps {
  activeTab: 'sistema' | 'operacional' | 'fluxo' | 'eficiencia' | 'avaliacao' | 'auditoria';
  setActiveTab: (tab: 'sistema' | 'operacional' | 'fluxo' | 'eficiencia' | 'avaliacao' | 'auditoria') => void;
  manifestos: Manifesto[];
  darkMode: boolean;
  setDarkMode: (val: boolean) => void;
  onSave: (d: any, operatorName: string) => void;
  onAction: (act: string, id: string) => void;
  openHistory: (id: string) => void;
  openEdit: (id: string) => void;
  onOpenReprFill: (id: string) => void;
  showAlert: (type: 'success' | 'error', msg: string) => void;
  activeUser: UserType | null;
  setActiveUser: (user: UserType | null) => void;
  onLogout: () => void;
}

export const MobileView: React.FC<MobileViewProps> = ({
  activeTab, setActiveTab, manifestos, darkMode, setDarkMode,
  onSave, onAction, openHistory, openEdit, onOpenReprFill,
  showAlert, activeUser, setActiveUser, onLogout
}) => {

  const [form, setForm] = useState({ cia: '', puxado: '', recebido: '' });
  const [loginId, setLoginId] = useState('');
  const [loginPass, setLoginPass] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const isAdmin = activeUser?.Usuario?.toLowerCase() === "rafael";
  const canSeeAvaliacao = isAdmin;
  const canSeeAuditoria = isAdmin;

  // Redireciona se estiver na aba oculta ou sem permissão
  React.useEffect(() => {
    if (activeTab === 'operacional') {
      setActiveTab('sistema');
    }
    if (activeTab === 'avaliacao' && !canSeeAvaliacao) {
      setActiveTab('sistema');
    }
    if (activeTab === 'auditoria' && !canSeeAuditoria) {
      setActiveTab('sistema');
    }
  }, [activeTab, setActiveTab, canSeeAvaliacao, canSeeAuditoria]);

  const handleLogin = async () => {
    if (!loginId.trim() || !loginPass.trim()) {
      showAlert('error', 'Preencha usuário e senha');
      return;
    }
    setIsLoggingIn(true);
    try {
      const { data, error } = await supabase
        .from('Cadastro_de_Perfil')
        .select('*')
        .ilike('Usuario', loginId.trim())
        .eq('Senha', loginPass.trim())
        .single();
      
      if (error) {
        showAlert('error', 'Credenciais Inválidas');
      } else {
        setActiveUser(data);
        localStorage.setItem('smo_active_profile', JSON.stringify(data));
        showAlert('success', `Bem-vindo, ${data.Nome_Completo}`);
      }
    } catch (err) {
      showAlert('error', 'Erro de conexão');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const getStatusClass = (status: string) => {
    switch (status) {
      case 'Manifesto Recebido': return 'bg-blue-600 text-white';
      case 'Manifesto Iniciado': return 'bg-amber-50 text-white';
      case 'Manifesto Finalizado': return 'bg-emerald-50 text-white';
      case 'Manifesto Entregue': return 'bg-emerald-700 text-white';
      case 'Manifesto Cancelado': return 'bg-red-600 text-white';
      default: return 'bg-slate-600 text-white';
    }
  };

  const formatTime = (iso: string | undefined) => {
    if (!iso || iso === '---') return '--:--';
    try {
      const d = new Date(iso);
      return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    } catch { return '--:--'; }
  };

  // TELA DE LOGIN MOBILE
  if (!activeUser) {
    return (
      <div className="flex flex-col h-screen bg-slate-50 dark:bg-slate-950 items-center justify-center p-6 font-sans">
        <div className="w-full max-w-sm bg-white dark:bg-slate-900 border-2 border-slate-900 dark:border-slate-800 p-8 shadow-2xl relative">
          <div className="absolute top-0 left-0 w-full h-1 bg-indigo-600"></div>
          <div className="flex flex-col items-center mb-10">
            <div className="p-4 bg-slate-900 dark:bg-slate-800 rounded-full mb-6">
              <UserIcon size={32} className="text-white" />
            </div>
            <h2 className="text-lg font-black uppercase tracking-[0.2em] text-slate-900 dark:text-white mb-1">Terminal Cadastro</h2>
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Identifique-se para acessar</p>
          </div>

          <div className="space-y-4">
            <div className="relative">
              <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input 
                type="text" 
                placeholder="USUÁRIO" 
                value={loginId} 
                onChange={e => setLoginId(e.target.value)}
                className="w-full h-14 pl-12 pr-4 bg-slate-50 dark:bg-slate-800/50 border-2 border-slate-100 dark:border-slate-700 text-xs font-black tracking-widest outline-none focus:border-indigo-600 dark:text-white transition-all"
              />
            </div>
            <div className="relative">
              <KeyRound className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input 
                type={showPass ? "text" : "password"} 
                placeholder="SENHA" 
                value={loginPass} 
                onChange={e => setLoginPass(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleLogin()}
                className="w-full h-14 pl-12 pr-12 bg-slate-50 dark:bg-slate-800/50 border-2 border-slate-100 dark:border-slate-700 text-xs font-black tracking-widest outline-none focus:border-indigo-600 dark:text-white transition-all"
              />
              <button 
                onClick={() => setShowPass(!showPass)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400"
              >
                {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            <button 
              onClick={handleLogin}
              disabled={isLoggingIn}
              className="w-full h-14 bg-slate-900 dark:bg-indigo-600 text-white font-black uppercase text-xs tracking-[0.2em] shadow-xl flex items-center justify-center gap-3 active:scale-95 transition-all"
            >
              {isLoggingIn ? <Loader2 className="animate-spin" size={18} /> : 'Acessar Terminal'}
            </button>
          </div>
          <p className="mt-8 text-center text-[8px] font-black text-slate-300 uppercase tracking-widest italic">SMO Command Center v2.5</p>
        </div>
      </div>
    );
  }

  const navItems = [
    { id: 'sistema', icon: LayoutGrid, label: 'Cadastro' },
    { id: 'fluxo', icon: Columns, label: 'Fluxo' },
    { id: 'eficiencia', icon: BarChart3, label: 'Dashboard' }
  ];

  if (canSeeAuditoria) {
    navItems.push({ id: 'auditoria', icon: ClipboardCheck, label: 'Auditoria' });
  }

  if (canSeeAvaliacao) {
    navItems.push({ id: 'avaliacao', icon: GraduationCap, label: 'Avaliação' });
  }

  return (
    <div className="flex flex-col h-screen bg-slate-50 dark:bg-slate-950 overflow-hidden font-sans">
      {/* Top Header Mobile */}
      <header className="bg-slate-900 dark:bg-black text-white h-16 flex items-center justify-between px-5 shrink-0 z-50 shadow-lg">
        <div className="flex items-center gap-2">
          <div className="p-1 bg-indigo-600 rounded">
            <Terminal size={18} />
          </div>
          <span className="text-sm font-black tracking-widest uppercase">SMO <span className="text-indigo-400">v2.5</span></span>
        </div>
        
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setDarkMode(!darkMode)}
            className="p-2 bg-slate-800 rounded-full text-indigo-400"
          >
            {darkMode ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          <button 
            onClick={onLogout}
            className="w-10 h-10 bg-indigo-600 rounded-full flex items-center justify-center font-black text-sm"
          >
            {activeUser.Nome_Completo?.charAt(0) || 'U'}
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto p-4 pb-24 space-y-4 custom-scrollbar">
        
        {activeTab === 'sistema' && (
          <div className="space-y-6 animate-fadeIn">
            <div className="bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm">
              <div className="bg-slate-100 dark:bg-slate-800 p-4 border-b border-slate-200 dark:border-slate-700">
                <h3 className="text-xs font-black uppercase tracking-widest flex items-center gap-2 text-slate-800 dark:text-white">
                  <Plus size={16} className="text-indigo-600" /> Registro Rápido
                </h3>
              </div>
              <div className="p-4 space-y-4">
                <div className="grid grid-cols-1 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-500 uppercase">CIA Aérea</label>
                    <CustomSelect 
                      value={form.cia} 
                      onChange={v => setForm({...form, cia: v})} 
                      placeholder="SELECIONE A CIA..."
                    />
                  </div>
                  <div className="grid grid-cols-1 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-500 uppercase">Puxado (Horário)</label>
                      <input 
                        type="datetime-local" 
                        value={form.puxado}
                        onChange={e => setForm({...form, puxado: e.target.value})}
                        className="w-full h-12 px-4 bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-lg text-sm font-bold outline-none focus:border-indigo-600 dark:text-white"
                      />
                    </div>
                  </div>
                </div>
                <button 
                  onClick={() => onSave({ cia: form.cia, dataHoraPuxado: form.puxado, dataHoraRecebido: form.puxado }, activeUser.Nome_Completo || 'User')}
                  className="w-full h-14 bg-indigo-600 text-white font-black uppercase text-xs tracking-widest rounded-lg shadow-lg active:scale-95 transition-transform"
                >
                  Registrar Manifesto
                </button>
              </div>
            </div>

            <div className="space-y-3">
              <h3 className="text-xs font-black uppercase tracking-widest text-slate-500 flex items-center gap-2 px-1">
                <Database size={16} /> Monitoramento Ativo
              </h3>
              {manifestos.filter(m => m.status !== 'Manifesto Entregue' && m.status !== 'Manifesto Cancelado').map(m => (
                <div key={m.id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-xl shadow-sm relative overflow-hidden group">
                  <div className={`absolute left-0 top-0 bottom-0 w-1 ${getStatusClass(m.status).split(' ')[0]}`}></div>
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 font-mono block">ID: {m.id}</span>
                      <h4 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight">{m.cia}</h4>
                    </div>
                    <span className={`text-[8px] font-black px-2 py-1 rounded uppercase tracking-tighter ${getStatusClass(m.status)}`}>
                      {m.status.replace('Manifesto ', '')}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[10px] font-bold text-slate-500 dark:text-slate-400 mb-4 border-t border-slate-50 dark:border-slate-800 pt-3">
                    <div className="flex flex-col">
                      <span className="text-[8px] uppercase text-slate-400">Puxado</span>
                      <span className="font-mono text-slate-800 dark:text-slate-200">{formatTime(m.dataHoraPuxado)}</span>
                    </div>
                    <div className="flex flex-col text-right">
                      <span className="text-[8px] uppercase text-slate-400">Recebido</span>
                      <span className="font-mono text-slate-800 dark:text-slate-200">{formatTime(m.dataHoraRecebido)}</span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => openHistory(m.id)} className="flex-1 h-10 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-lg text-[10px] font-black uppercase flex items-center justify-center gap-2">
                      <History size={14} /> Detalhes
                    </button>
                    <button onClick={() => openEdit(m.id)} className="w-12 h-10 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 rounded-lg flex items-center justify-center">
                      <Plus size={18} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'fluxo' && (
          <div className="space-y-4 animate-fadeIn">
            <h3 className="text-xs font-black uppercase tracking-widest text-slate-500 text-center py-2">Monitor de Fluxo (Mobile)</h3>
            {['Manifesto Recebido', 'Manifesto Iniciado', 'Manifesto Finalizado'].map(status => {
              const filtered = manifestos.filter(m => m.status === status);
              return (
                <div key={status} className="space-y-3">
                  <div className="flex items-center justify-between px-2">
                    <span className="text-[10px] font-black uppercase text-slate-400 tracking-tighter">{status}</span>
                    <span className="text-[10px] font-black bg-slate-200 dark:bg-slate-800 px-2 py-0.5 rounded-full">{filtered.length}</span>
                  </div>
                  <div className="flex overflow-x-auto gap-3 pb-2 no-scrollbar">
                    {filtered.map(m => (
                      <div key={m.id} className="min-w-[160px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3 rounded-lg shadow-sm">
                        <p className="text-[9px] font-black text-indigo-600 dark:text-indigo-400 mb-1">{m.id}</p>
                        <h4 className="text-[11px] font-black text-slate-800 dark:text-slate-100 uppercase truncate mb-2">{m.cia}</h4>
                        <div className="flex items-center gap-1.5 text-[8px] font-bold text-slate-400">
                          <Timer size={10} /> {formatTime(m.carimboDataHR)}
                        </div>
                      </div>
                    ))}
                    {filtered.length === 0 && <div className="w-full text-center py-4 text-[9px] font-bold text-slate-300 uppercase italic">Vazio</div>}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {activeTab === 'eficiencia' && (
          <div className="space-y-4 animate-fadeIn">
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'Total', val: manifestos.length, color: 'indigo' },
                { label: 'Entregues', val: manifestos.filter(m => m.status === 'Manifesto Entregue').length, color: 'emerald' },
                { label: 'Processo', val: manifestos.filter(m => m.status !== 'Manifesto Entregue' && m.status !== 'Manifesto Cancelado').length, color: 'amber' },
                { label: 'Cancelados', val: manifestos.filter(m => m.status === 'Manifesto Cancelado').length, color: 'red' }
              ].map((kpi, idx) => (
                <div key={idx} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-xl shadow-sm">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">{kpi.label}</p>
                  <p className={`text-2xl font-black text-${kpi.color}-600`}>{kpi.val}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'auditoria' && canSeeAuditoria && (
          <div className="flex-1 animate-fadeIn overflow-hidden">
             <div className="bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden h-full">
                <SlaAuditor manifestos={manifestos} openHistory={openHistory} />
             </div>
          </div>
        )}

        {activeTab === 'avaliacao' && canSeeAvaliacao && (
          <div className="flex-1 animate-fadeIn overflow-hidden">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden h-full">
              <AssessmentGuide onShowAlert={showAlert} />
            </div>
          </div>
        )}
      </main>

      {/* Bottom Navigation Mobile */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white dark:bg-black border-t border-slate-200 dark:border-slate-800 h-20 flex items-center justify-around px-2 z-[9999] shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id as any)}
            className={`flex flex-col items-center justify-center w-full h-full gap-1 transition-all ${activeTab === item.id ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400 dark:text-slate-600'}`}
          >
            <div className={`p-1 rounded-lg transition-colors ${activeTab === item.id ? 'bg-indigo-50 dark:bg-indigo-900/20' : ''}`}>
              <item.icon size={22} className={activeTab === item.id ? 'stroke-[2.5px]' : 'stroke-[1.5px]'} />
            </div>
            <span className={`text-[9px] font-black uppercase tracking-tighter ${activeTab === item.id ? 'opacity-100' : 'opacity-60'}`}>{item.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
};
