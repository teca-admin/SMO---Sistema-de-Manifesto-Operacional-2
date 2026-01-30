
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Dashboard } from './components/Dashboard';
import { OperationalDashboard } from './components/OperationalDashboard';
import { KanbanBoard } from './components/KanbanBoard';
import { EfficiencyDashboard } from './components/EfficiencyDashboard';
import { AssessmentGuide } from './components/AssessmentGuide';
import { SlaAuditor } from './components/SlaAuditor';
import { MobileView } from './components/MobileView';
import { ExternalLinksPortal } from './components/ExternalLinksPortal';
import { EditModal, LoadingOverlay, HistoryModal, AlertToast, CancellationModal, AssignResponsibilityModal, ReprFillModal } from './components/Modals';
import { Manifesto, User, SMO_Sistema_DB } from './types';
import { supabase } from './supabaseClient';
import { LayoutGrid, Plane, LogOut, Terminal, Activity, Columns, BarChart3, Sun, Moon, GraduationCap, ClipboardCheck, Lock, User as UserIcon, KeyRound, Eye, EyeOff, Loader2, ChevronDown, UserCircle, ShieldAlert, Link as LinkIcon } from 'lucide-react';

// Variável de controle fora do React para evitar stale closures
let GLOBAL_SESSION_ID: string | null = null;

function App() {
  const [activeTab, setActiveTab] = useState<'sistema' | 'operacional' | 'fluxo' | 'eficiencia' | 'avaliacao' | 'auditoria' | 'links'>('sistema');
  const [manifestos, setManifestos] = useState<Manifesto[]>([]);
  const [nextId, setNextId] = useState<string>('Automático');
  const [isMobile, setIsMobile] = useState(false);
  const [isExternalView, setIsExternalView] = useState(false);
  const [isVinciDashboardMode, setIsVinciDashboardMode] = useState(false);
  const [urlCiaFilter, setUrlCiaFilter] = useState<string | null>(null);
  
  // Estados para o Login Rápido no Header
  const [headerLoginOpen, setHeaderLoginOpen] = useState(false);
  const [hLoginUser, setHLoginUser] = useState('');
  const [hLoginPass, setHLoginPass] = useState('');
  const [hShowPass, setHShowPass] = useState(false);
  const [hIsLoggingIn, setHIsLoggingIn] = useState(false);

  const [darkMode, setDarkMode] = useState(() => {
    return localStorage.getItem('smo_theme') === 'dark';
  });

  const [editingId, setEditingId] = useState<string | null>(null);
  const [fillingReprId, setFillingReprId] = useState<string | null>(null);
  const [viewingHistoryId, setViewingHistoryId] = useState<string | null>(null);
  const [cancellationId, setCancellationId] = useState<string | null>(null);
  const [assigningId, setAssigningId] = useState<string | null>(null);
  const [loadingMsg, setLoadingMsg] = useState<string | null>(null);
  const [alert, setAlert] = useState<{type: 'success' | 'error', msg: string} | null>(null);
  
  const [activeUser, setActiveUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('smo_active_profile');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        GLOBAL_SESSION_ID = parsed.sesson_id || null;
        return parsed;
      } catch { return null; }
    }
    return null;
  });

  const activeOperatorName = activeUser?.Nome_Completo;

  const showAlert = (type: 'success' | 'error', msg: string) => {
     setAlert({ type, msg });
     setTimeout(() => setAlert(null), 6000);
  };

  const handleLogout = useCallback(async (clearDb: boolean = true) => {
    const userId = activeUser?.id;
    setActiveUser(null);
    GLOBAL_SESSION_ID = null;
    localStorage.removeItem('smo_active_profile');
    setHeaderLoginOpen(false);
    setIsVinciDashboardMode(false);
    if (clearDb && userId) {
      try {
        await supabase.from('Cadastro_de_Perfil').update({ sesson_id: null }).eq('id', userId);
      } catch (err) { console.error(err); }
    }
  }, [activeUser]);

  const handleHeaderLogin = async () => {
    if (!hLoginUser.trim() || !hLoginPass.trim()) {
      showAlert('error', 'Preencha usuário e senha');
      return;
    }
    setHIsLoggingIn(true);
    try {
      const { data, error } = await supabase.from('Cadastro_de_Perfil').select('*').ilike('Usuario', hLoginUser.trim()).eq('Senha', hLoginPass.trim()).single();
      if (error) {
        showAlert('error', 'Credenciais Inválidas');
      } else {
        const sessionId = crypto.randomUUID();
        const nowBR = new Date().toLocaleString('pt-BR');
        await supabase.from('Cadastro_de_Perfil').update({ sesson_id: sessionId, "Session_Data/HR": nowBR }).eq('id', data.id);
        const updatedUser = { ...data, sesson_id: sessionId };
        setActiveUser(updatedUser);
        localStorage.setItem('smo_active_profile', JSON.stringify(updatedUser));
        showAlert('success', `Bem-vindo, ${data.Nome_Completo}`);
        setHeaderLoginOpen(false);
        setHLoginUser(''); setHLoginPass('');
      }
    } catch (err) { showAlert('error', 'Erro de conexão'); } finally { setHIsLoggingIn(false); }
  };

  useEffect(() => {
    if (!activeUser || !activeUser.id) return;
    const validateSessionIntegrity = async () => {
      const { data, error } = await supabase.from('Cadastro_de_Perfil').select('sesson_id').eq('id', activeUser.id).single();
      if (!error && data && data.sesson_id && data.sesson_id !== GLOBAL_SESSION_ID) {
        handleLogout(false);
        showAlert('error', 'SESSÃO ENCERRADA: Este perfil foi aberto em outro computador.');
      }
    };
    window.addEventListener('focus', validateSessionIntegrity);
    const channel = supabase.channel(`security_check_${activeUser.id}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'Cadastro_de_Perfil', filter: `id=eq.${activeUser.id}` }, (payload) => {
          const remoteId = payload.new?.sesson_id;
          if (remoteId && remoteId !== GLOBAL_SESSION_ID) {
            handleLogout(false);
            showAlert('error', 'KICK-OUT: Novo login detectado em outro terminal.');
          }
      }).subscribe();
    return () => {
      window.removeEventListener('focus', validateSessionIntegrity);
      supabase.removeChannel(channel);
    };
  }, [activeUser?.id, handleLogout]);

  // PERMISSÕES REFINADAS
  const isVinciAdm = activeUser?.Usuario?.toUpperCase() === "VINCI ADM" || isVinciDashboardMode;
  const isWfsAdm = activeUser?.Usuario?.toUpperCase() === "WFS ADM";
  
  const canSeeCadastro = !isVinciAdm;
  const canSeePuxe = !isVinciAdm;
  const canSeeAvaliacao = isWfsAdm;
  const canSeeAuditoria = isWfsAdm || isVinciAdm;
  const canSeeLinks = isWfsAdm;

  useEffect(() => {
    if (isVinciAdm && (activeTab === 'sistema' || activeTab === 'operacional' || activeTab === 'links' || activeTab === 'avaliacao')) {
      setActiveTab('fluxo');
    }
  }, [isVinciAdm, activeTab]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const viewParam = params.get('view');
    const ciaParam = params.get('cia');
    if (ciaParam) setUrlCiaFilter(ciaParam);
    
    if (viewParam === 'fluxo') {
      setIsExternalView(true);
      setActiveTab('fluxo');
    } else if (viewParam === 'vinci') {
      setIsVinciDashboardMode(true);
      setActiveTab('fluxo');
      if (!activeUser) {
        setActiveUser({ id: -1, Usuario: "VINCI ADM", Nome_Completo: "DASHBOARD VINCI", Senha: "" } as any);
      }
    }
  }, []);

  useEffect(() => {
    if (darkMode) { document.documentElement.classList.add('dark'); localStorage.setItem('smo_theme', 'dark'); }
    else { document.documentElement.classList.remove('dark'); localStorage.setItem('smo_theme', 'light'); }
  }, [darkMode]);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const fetchNextId = useCallback(async () => {
      const year = new Date().getFullYear().toString().slice(-2); 
      const prefix = `MAO-${year}`;
      try {
        const { data } = await supabase.from('SMO_Sistema').select('ID_Manifesto').ilike('ID_Manifesto', `${prefix}%`).order('ID_Manifesto', { ascending: false }).limit(1);
        let nextSeq = 1;
        if (data && data.length > 0) {
            const lastId = data[0].ID_Manifesto;
            const lastSeq = parseInt(lastId.substring(prefix.length), 10);
            if (!isNaN(lastSeq)) nextSeq = lastSeq + 1;
        }
        const newId = `${prefix}${nextSeq.toString().padStart(7, '0')}`;
        setNextId(newId);
        return newId;
      } catch (err) { return 'Erro ID'; }
  }, []);

  const fetchManifestos = useCallback(async () => {
    try {
      const { data, error } = await supabase.from('SMO_Sistema').select('*').order('id', { ascending: false }).limit(500);
      if (error) throw error;
      if (data) {
        setManifestos(data.map((item: SMO_Sistema_DB) => ({
          id: item.ID_Manifesto, usuario: item.Usuario_Sistema, cia: item.CIA,
          dataHoraPuxado: item.Manifesto_Puxado, dataHoraRecebido: item.Manifesto_Recebido,
          dataHoraRepresentanteCIA: item.Representante_CIA, dataHoraEntregue: item.Manifesto_Entregue,
          status: item.Status, turno: item.Turno, carimboDataHR: item["Carimbo_Data/HR"],
          usuarioAcao: item["Usuario_Ação"], usuarioResponsavel: item["Usuario_Operação"], 
          dataHoraIniciado: item.Manifesto_Iniciado, dataHoraDisponivel: item.Manifesto_Disponivel,
          dataHoraConferencia: item["Manifesto_em_Conferência"], dataHoraCompleto: item.Manifesto_Completo
        })));
      }
    } catch (error) { console.error(error); }
  }, []);

  useEffect(() => {
    fetchManifestos(); fetchNextId();
    const interval = setInterval(fetchManifestos, 5000);
    return () => clearInterval(interval);
  }, [fetchManifestos, fetchNextId]);

  const updateStatus = async (id: string, status: string, fields: any = {}, operatorNameOverride?: string) => {
    const user = activeOperatorName || operatorNameOverride || "Sistema";
    if (status === 'Manifesto Entregue') {
      const target = manifestos.find(m => m.id === id);
      const signature = target?.dataHoraRepresentanteCIA || fields?.Representante_CIA;
      if (!signature || signature === '---' || signature === '') {
        showAlert('error', 'BLOQUEIO: Assinatura Repr. CIA é obrigatória para entrega.');
        return;
      }
    }
    setLoadingMsg("Processando...");
    try {
      const now = new Date().toLocaleString('pt-BR');
      const { Justificativa, ...dbUpdateFields } = fields;
      const updateData = { Status: status, "Carimbo_Data/HR": now, "Usuario_Ação": user, ...dbUpdateFields };
      if (status === 'Manifesto Entregue') updateData.Manifesto_Entregue = now;
      const { error } = await supabase.from('SMO_Sistema').update(updateData).eq('ID_Manifesto', id);
      if (error) throw error;
      await supabase.from('SMO_Operacional').insert({ ID_Manifesto: id, "Ação": status, Usuario: user, Justificativa: Justificativa || null, "Created_At_BR": now });
      showAlert('success', `Status: ${status}`);
      fetchManifestos();
    } catch (err: any) { showAlert('error', err.message); } finally { setLoadingMsg(null); }
  };

  if (isExternalView) {
    return (
      <div className="min-h-screen flex flex-col bg-[#f8fafc] dark:bg-[#0f172a] p-4 transition-colors duration-300">
        <KanbanBoard manifestos={manifestos} isExternalView={true} isAdmin={false} urlCiaFilter={urlCiaFilter} />
        {alert && <AlertToast type={alert.type} msg={alert.msg} />}
      </div>
    );
  }

  if (isMobile) {
    return (
      <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950">
        <MobileView activeTab={activeTab as any} setActiveTab={setActiveTab as any} manifestos={manifestos} darkMode={darkMode} setDarkMode={setDarkMode} onSave={() => {}} onAction={(act, id) => {}} openHistory={setViewingHistoryId} openEdit={setEditingId} onOpenReprFill={setFillingReprId} showAlert={showAlert} activeUser={activeUser} setActiveUser={setActiveUser} onLogout={() => handleLogout(true)} />
        {loadingMsg && <LoadingOverlay msg={loadingMsg} />}
        {alert && <AlertToast type={alert.type} msg={alert.msg} />}
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#f8fafc] dark:bg-[#0f172a] transition-colors duration-300 custom-scrollbar">
      <header className={`shrink-0 z-50 hidden md:block border-b-2 shadow-2xl ${isVinciDashboardMode ? 'bg-blue-950 border-blue-800' : 'bg-[#0f172a] dark:bg-[#020617] border-slate-800 dark:border-slate-900'}`}>
        <div className="flex items-center justify-between h-16 px-8">
          <div className="flex items-center gap-4 h-full">
            <div className="flex items-center gap-2">
              <div className={`p-1.5 ${isVinciDashboardMode ? 'bg-blue-600' : 'bg-indigo-600'}`}>
                <Terminal size={18} className="text-white" />
              </div>
              <h1 className="text-sm font-black tracking-[0.15em] uppercase">SMO <span className="text-indigo-400 font-normal">v2.5</span></h1>
            </div>
            <div className="h-8 w-[1px] bg-slate-700 mx-2" />
            <nav className="flex h-full">
              {canSeeCadastro && (<button onClick={() => setActiveTab('sistema')} className={`group flex items-center justify-center gap-2 w-32 h-16 text-[9px] font-black uppercase tracking-widest transition-all border-b-4 ${activeTab === 'sistema' ? 'border-indigo-500 bg-slate-800/50 text-white' : 'border-transparent text-slate-300 hover:text-white hover:bg-slate-800/30'}`}><LayoutGrid size={13} className={activeTab === 'sistema' ? 'text-indigo-400' : 'text-slate-100'} />CADASTRO</button>)}
              {canSeePuxe && (<button onClick={() => setActiveTab('operacional')} className={`group flex items-center justify-center gap-2 w-32 h-16 text-[9px] font-black uppercase tracking-widest transition-all border-b-4 ${activeTab === 'operacional' ? 'border-red-500 bg-slate-800/50 text-white' : 'border-transparent text-slate-300 hover:text-white hover:bg-slate-800/30'}`}><Plane size={13} className={activeTab === 'operacional' ? 'text-red-400' : 'text-slate-100'} />PUXE</button>)}
              <button onClick={() => setActiveTab('fluxo')} className={`group flex items-center justify-center gap-2 w-32 h-16 text-[9px] font-black uppercase tracking-widest transition-all border-b-4 ${activeTab === 'fluxo' ? 'border-emerald-500 bg-slate-800/50 text-white' : 'border-transparent text-slate-300 hover:text-white hover:bg-slate-800/30'}`}><Columns size={13} className={activeTab === 'fluxo' ? 'text-emerald-400' : 'text-slate-100'} />FLUXO</button>
              <button onClick={() => setActiveTab('eficiencia')} className={`group flex items-center justify-center gap-2 w-32 h-16 text-[9px] font-black uppercase tracking-widest transition-all border-b-4 ${activeTab === 'eficiencia' ? 'border-yellow-500 bg-slate-800/50 text-white' : 'border-transparent text-slate-300 hover:text-white hover:bg-slate-800/30'}`}><BarChart3 size={13} className={activeTab === 'eficiencia' ? 'text-yellow-400' : 'text-slate-100'} />EFICIÊNCIA</button>
              {canSeeAuditoria && (<button onClick={() => setActiveTab('auditoria')} className={`group flex items-center justify-center gap-2 w-32 h-16 text-[9px] font-black uppercase tracking-widest transition-all border-b-4 ${activeTab === 'auditoria' ? 'border-blue-500 bg-slate-800/50 text-white' : 'border-transparent text-slate-300 hover:text-white hover:bg-slate-800/30'}`}><ClipboardCheck size={13} className={activeTab === 'auditoria' ? 'text-blue-400' : 'text-slate-100'} />AUDITORIA</button>)}
              {canSeeAvaliacao && (<button onClick={() => setActiveTab('avaliacao')} className={`group flex items-center justify-center gap-2 w-32 h-16 text-[9px] font-black uppercase tracking-widest transition-all border-b-4 ${activeTab === 'avaliacao' ? 'border-orange-500 bg-slate-800/50 text-white' : 'border-transparent text-slate-300 hover:text-white hover:bg-slate-800/30'}`}><GraduationCap size={13} className={activeTab === 'avaliacao' ? 'text-orange-400' : 'text-slate-100'} />AVALIAÇÃO</button>)}
              {canSeeLinks && (<button onClick={() => setActiveTab('links')} className={`group flex items-center justify-center gap-2 w-32 h-16 text-[9px] font-black uppercase tracking-widest transition-all border-b-4 ${activeTab === 'links' ? 'border-pink-500 bg-slate-800/50 text-white' : 'border-transparent text-slate-300 hover:text-white hover:bg-slate-800/30'}`}><LinkIcon size={13} className={activeTab === 'links' ? 'text-pink-400' : 'text-slate-100'} />LINKS</button>)}
            </nav>
          </div>
          <div className="flex items-center gap-6">
            <button onClick={() => setDarkMode(!darkMode)} className="p-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-indigo-400 transition-all rounded">{darkMode ? <Sun size={16} /> : <Moon size={16} />}</button>
            {isVinciDashboardMode ? (
              <div className="flex items-center gap-3 px-4 py-1.5 bg-blue-900/50 border border-blue-700"><ShieldAlert size={14} className="text-blue-400 animate-pulse" /><div className="text-left leading-none"><p className="text-[9px] font-bold text-blue-300 uppercase">Acesso Dashboard</p><p className="text-[10px] font-black text-white">VINCI ADM</p></div></div>
            ) : (<div className="hidden lg:flex items-center gap-3 px-4 py-1.5 bg-slate-800 border border-slate-700"><Activity size={14} className="text-emerald-400" /><div className="text-left leading-none"><p className="text-[9px] font-bold text-slate-400 uppercase">Sistema Operacional</p><p className="text-[10px] font-bold text-slate-200">Online</p></div></div>)}
            <div className="relative">
              <button onClick={() => setHeaderLoginOpen(!headerLoginOpen)} className={`h-10 px-4 transition-all flex flex-col justify-center border ${activeUser ? 'bg-indigo-600/10 border-indigo-500/50 text-indigo-100' : 'bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700'}`}><div className="flex items-center gap-2">{activeUser ? <UserCircle size={14} className="text-indigo-400" /> : <Lock size={14} className="text-slate-400" />}<p className="text-[9px] font-black uppercase tracking-tighter">{activeUser ? 'Perfil Ativo' : 'Acesso Restrito'}</p></div><p className="text-[11px] font-bold uppercase truncate max-w-[120px]">{activeUser ? activeUser.Usuario : 'Acesso ADM'}</p></button>
              {headerLoginOpen && (
                <div className="absolute top-full right-0 mt-2 w-72 bg-white dark:bg-slate-900 border-2 border-slate-900 dark:border-slate-700 shadow-2xl p-6 animate-fadeIn z-[100]"><div className="absolute top-0 right-6 -translate-y-full border-[8px] border-transparent border-b-slate-900 dark:border-b-slate-700"></div>{activeUser ? (<div className="space-y-4"><div className="flex flex-col items-center text-center p-4 bg-slate-50 dark:bg-slate-800 rounded"><div className="w-12 h-12 bg-indigo-600 rounded-full flex items-center justify-center text-white font-black text-lg mb-2">{activeUser.Nome_Completo.charAt(0)}</div><p className="text-xs font-black text-slate-900 dark:text-white uppercase truncate w-full">{activeUser.Nome_Completo}</p><p className="text-[9px] font-bold text-slate-400 uppercase">{activeUser.Usuario}</p></div><button onClick={() => handleLogout(true)} className="w-full h-10 bg-red-600 hover:bg-red-700 text-white font-black text-[10px] uppercase tracking-widest transition-all flex items-center justify-center gap-2"><LogOut size={14} /> Encerrar Sessão</button></div>) : (<div className="space-y-4"><div className="flex items-center gap-2 mb-2"><div className="p-1.5 bg-indigo-600 rounded"><Lock size={14} className="text-white" /></div><p className="text-[10px] font-black text-slate-900 dark:text-white uppercase">Login Administrativo</p></div><div className="space-y-3"><div className="relative"><UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} /><input type="text" placeholder="USUÁRIO" value={hLoginUser} onChange={e => setHLoginUser(e.target.value)} className="w-full h-10 pl-10 pr-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[10px] font-black outline-none focus:border-indigo-600 text-slate-900 dark:text-white uppercase" /></div><div className="relative"><KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} /><input type={hShowPass ? "text" : "password"} placeholder="SENHA" value={hLoginPass} onChange={e => setHLoginPass(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleHeaderLogin()} className="w-full h-10 pl-10 pr-10 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[10px] font-black outline-none focus:border-indigo-600 text-slate-900 dark:text-white uppercase" /><button onClick={() => setHShowPass(!hShowPass)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">{hShowPass ? <EyeOff size={14} /> : <Eye size={14} />}</button></div><button onClick={handleHeaderLogin} disabled={hIsLoggingIn} className="w-full h-11 bg-slate-900 dark:bg-indigo-600 hover:bg-indigo-700 text-white font-black text-[10px] uppercase tracking-widest transition-all flex items-center justify-center gap-3 shadow-lg">{hIsLoggingIn ? <Loader2 className="animate-spin" size={14} /> : 'Autenticar'}</button></div></div>)}</div>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-auto p-6">
        <div className="max-w-[1700px] mx-auto space-y-6">
          {activeTab === 'sistema' && canSeeCadastro ? (<Dashboard manifestos={manifestos} activeUser={activeUser} onSave={() => {}} onAction={() => {}} openHistory={setViewingHistoryId} openEdit={setEditingId} onOpenReprFill={setFillingReprId} onShowAlert={showAlert} nextId={nextId} onLogout={() => handleLogout(true)} onOperatorChange={setActiveUser} />) 
          : activeTab === 'operacional' && canSeePuxe ? (<OperationalDashboard manifestos={manifestos} onAction={updateStatus} onOpenAssign={setAssigningId} />) 
          : activeTab === 'fluxo' ? (<KanbanBoard manifestos={manifestos} isAdmin={isWfsAdm || isVinciAdm} urlCiaFilter={urlCiaFilter} />) 
          : activeTab === 'eficiencia' ? (<EfficiencyDashboard manifestos={manifestos} activeUser={activeUser} openHistory={setViewingHistoryId} />) 
          : activeTab === 'auditoria' ? (canSeeAuditoria && <SlaAuditor manifestos={manifestos} openHistory={setViewingHistoryId} />) 
          : activeTab === 'avaliacao' ? (canSeeAvaliacao && <AssessmentGuide onShowAlert={showAlert} />) 
          : activeTab === 'links' ? (canSeeLinks && <ExternalLinksPortal />)
          : (<div className="flex items-center justify-center h-64 text-slate-400 font-black uppercase tracking-widest italic">Redirecionando...</div>)}
        </div>
      </main>

      {editingId && (<EditModal data={manifestos.find(m => m.id === editingId)!} onClose={() => setEditingId(null)} onSave={() => {}} />)}
      {viewingHistoryId && <HistoryModal data={manifestos.find(m => m.id === viewingHistoryId)!} onClose={() => setViewingHistoryId(null)} />}
      {alert && <AlertToast type={alert.type} msg={alert.msg} />}
      {loadingMsg && <LoadingOverlay msg={loadingMsg} />}
    </div>
  );
}

export default App;
