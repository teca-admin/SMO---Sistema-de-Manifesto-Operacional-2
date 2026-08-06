
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Dashboard } from './components/Dashboard';
import { OperationalDashboard } from './components/OperationalDashboard';
import { KanbanBoard } from './components/KanbanBoard';
import { EfficiencyDashboard } from './components/EfficiencyDashboard';
import { AssessmentGuide } from './components/AssessmentGuide';
import { SlaAuditor } from './components/SlaAuditor';
import { MobileView } from './components/MobileView';
import { AlertaInspecao } from './components/AlertaInspecao';
import { EditModal, LoadingOverlay, HistoryModal, AlertToast, CancellationModal, AssignResponsibilityModal, ReprFillModal } from './components/Modals';
import { Manifesto, User, SMO_Sistema_DB } from './types';
import { supabase, DB_SCHEMA } from './supabaseClient';
import { LayoutGrid, Plane, LogOut, Terminal, Activity, Columns, BarChart3, Sun, Moon, GraduationCap, ClipboardCheck } from 'lucide-react';

// Variável de controle fora do React para evitar stale closures
let GLOBAL_SESSION_ID: string | null = null;
let lastSessionCheckAt = 0;
const SESSION_CHECK_MIN_INTERVAL_MS = 15000;

const MANIFESTO_CACHE_KEY = 'smo_manifestos_v2';

const toManifesto = (item: SMO_Sistema_DB): import('./types').Manifesto => ({
  id: item.ID_Manifesto,
  usuario: item.Usuario_Sistema,
  cia: item.CIA,
  dataHoraPuxado: item.Manifesto_Puxado,
  dataHoraRecebido: item.Manifesto_Recebido,
  dataHoraRepresentanteCIA: item.Representante_CIA,
  dataHoraEntregue: item.Manifesto_Entregue,
  status: item.Status,
  turno: item.Turno,
  carimboDataHR: item["Carimbo_Data/HR"],
  usuarioAcao: item["Usuario_Ação"],
  usuarioResponsavel: item["Usuario_Operação"],
  dataHoraIniciado: item.Manifesto_Iniciado,
  dataHoraDisponivel: item.Manifesto_Disponivel,
  dataHoraConferencia: item["Manifesto_em_Conferência"],
  dataHoraCompleto: item.Manifesto_Completo
});

function App() {
  const [activeTab, setActiveTab] = useState<'sistema' | 'operacional' | 'fluxo' | 'eficiencia' | 'avaliacao' | 'auditoria'>('sistema');
  const [manifestos, setManifestos] = useState<Manifesto[]>([]);
  const [nextId, setNextId] = useState<string>('Automático');
  const [isMobile, setIsMobile] = useState(false);
  const [isExternalView, setIsExternalView] = useState(false);
  
  const [darkMode, setDarkMode] = useState(() => {
    return localStorage.getItem('smo_theme') === 'dark';
  });

  const [editingId, setEditingId] = useState<string | null>(null);
  const [fillingReprId, setFillingReprId] = useState<string | null>(null);
  const [viewingHistoryId, setViewingHistoryId] = useState<string | null>(null);
  const [viewingHistoryData, setViewingHistoryData] = useState<import('./types').Manifesto | null>(null);
  const hasFullData = useRef(false);
  const lastSyncRef = useRef<string>(new Date(0).toISOString());
  const isFetchingRef = useRef(false);
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

  // Reflete especificamente falhas de conexão/leitura com o Supabase (fetchManifestos),
  // não qualquer erro de negócio (login errado, validação, etc.) — usado no badge "Supabase Status".
  const [connectionError, setConnectionError] = useState<string | null>(null);

  const showAlert = (type: 'success' | 'error', msg: string) => {
     setAlert({ type, msg });
     setTimeout(() => setAlert(null), 6000);
  };

  const handleLogout = useCallback(async (clearDb: boolean = true) => {
    const userId = activeUser?.id;
    
    // Limpeza local imediata
    setActiveUser(null);
    GLOBAL_SESSION_ID = null;
    localStorage.removeItem('smo_active_profile');

    if (clearDb && userId) {
      try {
        await supabase
          .from('Cadastro_de_Perfil')
          .update({ sesson_id: null })
          .eq('id', userId);
      } catch (err) {
        console.error("Erro ao limpar sessão remota:", err);
      }
    }
  }, [activeUser]);

  // MONITOR DE SESSÃO DUPLICADA (REALTIME + FOCUS CHECK)
  useEffect(() => {
    if (!activeUser || !activeUser.id) return;

    // Função para validar se o ID no banco é igual ao ID desta máquina
    const validateSessionIntegrity = async () => {
      const now = Date.now();
      if (now - lastSessionCheckAt < SESSION_CHECK_MIN_INTERVAL_MS) return;
      lastSessionCheckAt = now;

      const { data, error } = await supabase
        .from('Cadastro_de_Perfil')
        .select('sesson_id')
        .eq('id', activeUser.id)
        .single();
      
      if (!error && data) {
        // Se o banco tem um ID e é diferente do nosso ID global salvo no login
        if (data.sesson_id && data.sesson_id !== GLOBAL_SESSION_ID) {
          handleLogout(false);
          showAlert('error', 'SESSÃO ENCERRADA: Este perfil foi aberto em outro computador. Acesso revogado neste terminal.');
        }
      }
    };

    // 1. Verifica integridade ao abrir a aba ou mudar de aba (Focus)
    window.addEventListener('focus', validateSessionIntegrity);

    // 2. Realtime: Escuta mudanças na tabela em tempo real
    /* 
    Desativado temporariamente para diagnosticar falha de conexão WebSocket em ambiente self-hosted
    const channel = supabase
      .channel(`security_check_${activeUser.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: DB_SCHEMA,
          table: 'Cadastro_de_Perfil',
          filter: `id=eq.${activeUser.id}`
        },
        (payload) => {
          const remoteId = payload.new?.sesson_id;
          if (remoteId && remoteId !== GLOBAL_SESSION_ID) {
            handleLogout(false);
            showAlert('error', 'KICK-OUT: Novo login detectado. Sessão encerrada instantaneamente por segurança.');
          }
        }
      )
      .subscribe();
    */

    return () => {
      window.removeEventListener('focus', validateSessionIntegrity);
      // supabase.removeChannel(channel);
    };
  }, [activeUser?.id, handleLogout]);

  // Atualiza a variável global sempre que o usuário ativo mudar (ex: no login)
  useEffect(() => {
    if (activeUser) {
      localStorage.setItem('smo_active_profile', JSON.stringify(activeUser));
      GLOBAL_SESSION_ID = activeUser.sesson_id || null;
    }
  }, [activeUser]);

  const activeOperatorName = activeUser?.Nome_Completo || null;
  
  // LOGICA DE PERMISSÃO REFINADA
  const isRafael = activeUser?.Usuario?.toUpperCase() === "RAFAEL";
  const isVinciAdm = activeUser?.Usuario?.toUpperCase() === "VINCI ADM";
  
  // Ambos podem ver auditoria e têm privilégios de visualização no Kanban
  const isAdmin = isRafael || isVinciAdm;
  const canSeeAuditoria = isRafael || isVinciAdm;

  // Apenas Rafael pode ver Avaliação
  const canSeeAvaliacao = isRafael;

  // Captura o dado do manifesto na hora do clique para evitar undefined se o estado mudar
  const openHistory = useCallback((id: string) => {
    const found = manifestos.find(m => m.id === id);
    if (found) {
      setViewingHistoryId(id);
      setViewingHistoryData(found);
    }
  }, [manifestos]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('view') === 'fluxo') {
      setIsExternalView(true);
      setActiveTab('fluxo');
    }
  }, []);

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('smo_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('smo_theme', 'light');
    }
  }, [darkMode]);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const getCurrentTimestampBR = () => {
    const d = new Date();
    const date = d.toLocaleDateString('pt-BR');
    const time = d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    return `${date} ${time}`;
  };

  const getTurnoAtual = () => {
    const hora = new Date().getHours();
    if (hora >= 6 && hora < 14) return '1º TURNO';
    if (hora >= 14 && hora < 22) return '2º TURNO';
    return '3º TURNO';
  };

  const fetchNextId = useCallback(async () => {
      try {
        const { data, error } = await supabase.rpc('next_manifesto_id');

        if (error) {
          console.error("Error fetching next ID:", error);
          return 'Erro ID';
        }

        setNextId(data);
        return data as string;
      } catch (err) {
        console.error("Critical error in fetchNextId:", err);
        return 'Erro ID';
      }
  }, []);

  const fetchManifestos = useCallback(async (delta: boolean = false) => {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;
    try {
      // Poll incremental: só busca o que mudou desde a última sincronização bem-sucedida
      if (delta) {
        const requestStartedAt = new Date().toISOString();
        const { data, error } = await supabase
          .from('SMO_Sistema')
          .select('*')
          .gte('updated_at', lastSyncRef.current)
          .order('updated_at', { ascending: true })
          .limit(2000);
        if (error) {
          console.error("DETAILED ERROR fetching manifestos (delta):", error);
          setConnectionError(error.message);
          return;
        }
        setConnectionError(null);
        if (data && data.length > 0) {
          setManifestos(prev => {
            const byId = new Map(prev.map(m => [m.id, m]));
            for (const row of data) byId.set(row.ID_Manifesto, toManifesto(row));
            const merged = Array.from(byId.values()).sort((a, b) => (a.id < b.id ? 1 : a.id > b.id ? -1 : 0));
            try { localStorage.setItem(MANIFESTO_CACHE_KEY, JSON.stringify(merged)); } catch {}
            return merged;
          });
        }
        lastSyncRef.current = requestStartedAt;
        return;
      }

      const PAGE = 1000;

      // Carrega primeira página e renderiza imediatamente
      const requestStartedAt = new Date().toISOString();
      const { data: firstPage, error: firstError } = await supabase
        .from('SMO_Sistema')
        .select('*')
        .order('id', { ascending: false })
        .range(0, PAGE - 1);
      if (firstError) {
        console.error("DETAILED ERROR fetching manifestos:", firstError);
        setConnectionError(firstError.message);
        showAlert('error', `Erro ao ler banco: ${firstError.message} (Código: ${firstError.code}). Verifique o console para detalhes.`);
        return;
      }
      setConnectionError(null);
      // Mostra primeira página apenas se ainda não temos todos os dados (evita reduzir dataset durante polls)
      if (!hasFullData.current) {
        setManifestos((firstPage ?? []).map(toManifesto));
      }

      if (!firstPage || firstPage.length < PAGE) {
        const partial = (firstPage ?? []).map(toManifesto);
        setManifestos(partial);
        hasFullData.current = true;
        lastSyncRef.current = requestStartedAt;
        try { localStorage.setItem(MANIFESTO_CACHE_KEY, JSON.stringify(partial)); } catch {}
        return;
      }

      // Carrega páginas restantes em background (sem bloquear a UI)
      let allData: SMO_Sistema_DB[] = [...firstPage];
      let from = PAGE;
      while (true) {
        const { data, error } = await supabase
          .from('SMO_Sistema')
          .select('*')
          .order('id', { ascending: false })
          .range(from, from + PAGE - 1);
        if (error) break;
        if (data && data.length > 0) allData = allData.concat(data);
        if (!data || data.length < PAGE) break;
        from += PAGE;
      }
      const result = allData.map(toManifesto);
      setManifestos(result);
      hasFullData.current = true;
      lastSyncRef.current = requestStartedAt;
      try { localStorage.setItem(MANIFESTO_CACHE_KEY, JSON.stringify(result)); } catch {}
    } catch (error) { console.error(error); }
    finally { isFetchingRef.current = false; }
  }, []);

  useEffect(() => {
    if (!localStorage.getItem('smo_migration_nomenclatura_v2')) {
      Promise.all([
        supabase.from('SMO_Operacional').update({ 'Ação': 'Manifesto Puxado' }).eq('Ação', 'Manifesto Cadastrado'),
        supabase.from('SMO_Operacional').update({ 'Ação': 'Assinatura Representante' }).eq('Ação', 'Assinatura Repr. CIA'),
      ])
        .then(() => localStorage.setItem('smo_migration_nomenclatura_v2', '1'))
        .catch(e => console.error('Migração de nomenclatura falhou:', e));
    }
  }, []);

  useEffect(() => {
    // Mostra cache imediatamente para evitar tela em branco
    // Se tiver cache, marca hasFullData para não reduzir o dataset durante o fetch inicial
    try {
      const cached = localStorage.getItem(MANIFESTO_CACHE_KEY);
      if (cached) {
        setManifestos(JSON.parse(cached));
        hasFullData.current = true;
      }
    } catch {}
    fetchManifestos(false);
    fetchNextId();
    const interval = setInterval(() => fetchManifestos(true), 60000);
    return () => clearInterval(interval);
  }, [fetchManifestos, fetchNextId]);

  const updateStatus = async (id: string, status: string, fields: any = {}, operatorNameOverride?: string) => {
    const user = activeOperatorName || operatorNameOverride || "Sistema";
    const target = manifestos.find(m => m.id === id);

    // Bloqueia qualquer ação em manifesto já encerrado
    if (target?.status === 'Manifesto Entregue' || target?.status === 'Manifesto Cancelado') {
      showAlert('error', `BLOQUEIO: Manifesto já encerrado (${target.status}). Nenhuma ação permitida.`);
      return;
    }

    if (status === 'Manifesto Entregue') {
      const signature = target?.dataHoraRepresentanteCIA || fields?.Representante_CIA;
      if (!signature || signature === '---' || signature === '') {
        showAlert('error', 'BLOQUEIO: Assinatura Repr. CIA é obrigatória para entrega.');
        return;
      }
    }

    setLoadingMsg("Processando...");
    try {
      const now = getCurrentTimestampBR();
      const { Justificativa, ...dbUpdateFields } = fields;

      const updateData = { 
        Status: status, 
        "Carimbo_Data/HR": now, 
        "Usuario_Ação": user, 
        ...dbUpdateFields 
      };
      
      if (status === 'Manifesto Entregue') {
        updateData.Manifesto_Entregue = now;
      }

      const { error } = await supabase.from('SMO_Sistema').update(updateData).eq('ID_Manifesto', id);
      if (error) throw error;

      supabase.from('SMO_Operacional').insert({
        ID_Manifesto: id,
        "Ação": status,
        Usuario: user,
        Justificativa: Justificativa || null,
        "Created_At_BR": now
      }).then(({ error: logErr }) => { if (logErr) console.error('Falha ao registrar log operacional:', logErr); });

      // Atualiza estado local sem recarregar tudo
      const dbToState: Record<string, string> = {
        Manifesto_Iniciado: 'dataHoraIniciado',
        Manifesto_Completo: 'dataHoraCompleto',
        Representante_CIA: 'dataHoraRepresentanteCIA',
        Manifesto_Entregue: 'dataHoraEntregue',
        Manifesto_Puxado: 'dataHoraPuxado',
        Manifesto_Recebido: 'dataHoraRecebido',
        'Usuario_Operação': 'usuarioResponsavel',
      };
      setManifestos(prev => prev.map(m => {
        if (m.id !== id) return m;
        const patch: Record<string, string> = { status, carimboDataHR: now, usuarioAcao: user };
        for (const [db, st] of Object.entries(dbToState)) {
          if (dbUpdateFields[db] !== undefined) patch[st] = dbUpdateFields[db];
        }
        if (status === 'Manifesto Entregue') patch['dataHoraEntregue'] = now;
        return { ...m, ...patch };
      }));
      showAlert('success', `Status: ${status}`);
    } catch (err: any) { 
      showAlert('error', err.message); 
    } finally { 
      setLoadingMsg(null); 
    }
  };

  const handleSaveEdit = async (data: any) => {
    const user = activeOperatorName || "Sistema";
    setLoadingMsg("Salvando Alterações...");
    try {
      const now = getCurrentTimestampBR();
      const { error } = await supabase.from('SMO_Sistema').update({
        CIA: data.cia,
        Manifesto_Puxado: data.dataHoraPuxado,
        Manifesto_Recebido: data.dataHoraRecebido,
        Representante_CIA: data.dataHoraRepresentanteCIA,
        Manifesto_Entregue: data.dataHoraEntregue,
        Manifesto_Iniciado: data.dataHoraIniciado,
        Manifesto_Completo: data.dataHoraCompleto,
        "Carimbo_Data/HR": now,
        "Usuario_Ação": user
      }).eq('ID_Manifesto', data.id);

      if (error) throw error;

      supabase.from('SMO_Operacional').insert({
        ID_Manifesto: data.id,
        "Ação": "Edição de Monitoramento",
        Usuario: user,
        Justificativa: data.justificativa,
        "Created_At_BR": now
      }).then(({ error: logErr }) => { if (logErr) console.error('Falha ao registrar log operacional:', logErr); });

      // Atualiza estado local sem recarregar tudo
      setManifestos(prev => prev.map(m => m.id === data.id ? {
        ...m,
        cia: data.cia,
        dataHoraPuxado: data.dataHoraPuxado,
        dataHoraRecebido: data.dataHoraRecebido,
        dataHoraRepresentanteCIA: data.dataHoraRepresentanteCIA,
        dataHoraEntregue: data.dataHoraEntregue,
        dataHoraIniciado: data.dataHoraIniciado,
        dataHoraCompleto: data.dataHoraCompleto,
        carimboDataHR: now,
        usuarioAcao: user,
      } : m));
      showAlert('success', 'Monitoramento Atualizado');
      setEditingId(null);
    } catch (err: any) {
      showAlert('error', err.message);
    } finally {
      setLoadingMsg(null);
    }
  };

  const handleSaveReprDate = async (id: string, date: string) => {
    const target = manifestos.find(m => m.id === id);
    if (target?.status === 'Manifesto Entregue' || target?.status === 'Manifesto Cancelado') {
      showAlert('error', `BLOQUEIO: Manifesto já encerrado (${target.status}). Assinatura não permitida.`);
      return;
    }
    setLoadingMsg("Registrando Assinatura...");
    try {
      const now = getCurrentTimestampBR();
      const user = activeOperatorName || "Sistema";
      
      const d = new Date(date);
      const brDate = d.toLocaleDateString('pt-BR') + ' ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

      const { error } = await supabase
        .from('SMO_Sistema')
        .update({ 
          Representante_CIA: brDate,
          "Carimbo_Data/HR": now,
          "Usuario_Ação": user
        })
        .eq('ID_Manifesto', id);

      if (error) throw error;

      supabase.from('SMO_Operacional').insert({
        ID_Manifesto: id,
        "Ação": "Assinatura Representante",
        Usuario: user,
        "Created_At_BR": now
      }).then(({ error: logErr }) => { if (logErr) console.error('Falha ao registrar log operacional:', logErr); });

      // Atualiza estado local sem recarregar tudo
      setManifestos(prev => prev.map(m => m.id === id ? {
        ...m,
        dataHoraRepresentanteCIA: brDate,
        carimboDataHR: now,
        usuarioAcao: user,
      } : m));
      showAlert('success', 'Assinatura Registrada');
      setFillingReprId(null);
    } catch (err: any) {
      showAlert('error', err.message);
    } finally {
      setLoadingMsg(null);
    }
  };

  if (isExternalView) {
    return (
      <div className="min-h-screen flex flex-col bg-[#f8fafc] dark:bg-[#0f172a] p-4 transition-colors duration-300">
        <KanbanBoard manifestos={manifestos} isExternalView={true} isAdmin={false} />
        {alert && <AlertToast type={alert.type} msg={alert.msg} />}
      </div>
    );
  }

  if (isMobile) {
    return (
      <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950">
        <MobileView 
          activeTab={(activeTab === 'avaliacao' && !canSeeAvaliacao) || (activeTab === 'auditoria' && !canSeeAuditoria) ? 'sistema' : activeTab as any}
          setActiveTab={setActiveTab as any}
          manifestos={manifestos}
          darkMode={darkMode}
          setDarkMode={setDarkMode}
          onSave={async (d) => {
            if (!activeOperatorName) return showAlert('error', 'Sessão expirada. Faça login novamente.');
            setLoadingMsg("Registrando...");
            const id = await fetchNextId();
            const turno = getTurnoAtual();
            const now = getCurrentTimestampBR();
            const { error } = await supabase.from('SMO_Sistema').insert({
              ID_Manifesto: id,
              Usuario_Sistema: activeOperatorName,
              CIA: d.cia,
              Manifesto_Puxado: d.dataHoraPuxado,
              Manifesto_Recebido: d.dataHoraRecebido,
              Status: "Manifesto Recebido",
              Turno: turno,
              "Carimbo_Data/HR": now,
              "Usuario_Ação": activeOperatorName
            });

            if (!error) {
              supabase.from('SMO_Operacional').insert({
                ID_Manifesto: id,
                "Ação": "Manifesto Puxado",
                Usuario: activeOperatorName,
                "Created_At_BR": now
              }).then(({ error: logErr }) => { if (logErr) console.error('Falha ao registrar log operacional:', logErr); });
              // Adiciona novo manifesto ao estado local sem recarregar tudo
              setManifestos(prev => [{
                id, usuario: activeOperatorName!, cia: d.cia,
                dataHoraPuxado: d.dataHoraPuxado, dataHoraRecebido: d.dataHoraRecebido,
                status: "Manifesto Recebido", turno, carimboDataHR: now, usuarioAcao: activeOperatorName!,
              }, ...prev]);
              showAlert('success', `Registro Concluído (${turno})`);
            } else {
              showAlert('error', error.message);
            }
            setLoadingMsg(null);
          }}
          onAction={(act, id) => {
            if (act === 'entregar') updateStatus(id, 'Manifesto Entregue');
            else if (act === 'Manifesto Iniciado') updateStatus(id, 'Manifesto Iniciado', { Manifesto_Iniciado: getCurrentTimestampBR() });
            else if (act === 'Manifesto Finalizado') updateStatus(id, 'Manifesto Finalizado', { Manifesto_Completo: getCurrentTimestampBR() });
            else if (act === 'Manifesto Recebido') updateStatus(id, 'Manifesto Recebido', { "Usuario_Operação": activeOperatorName });
            else if (act === 'cancelar') setCancellationId(id);
          }}
          openHistory={openHistory}
          openEdit={setEditingId}
          onOpenReprFill={setFillingReprId}
          showAlert={showAlert}
          activeUser={activeUser}
          setActiveUser={setActiveUser}
          onLogout={() => handleLogout(true)}
        />
        {editingId && (
          <EditModal data={manifestos.find(m => m.id === editingId)!} onClose={() => setEditingId(null)} onSave={handleSaveEdit} />
        )}
        {viewingHistoryId && viewingHistoryData && <HistoryModal data={viewingHistoryData} onClose={() => { setViewingHistoryId(null); setViewingHistoryData(null); }} />}
        {fillingReprId && (
          <ReprFillModal
            manifesto={manifestos.find(m => m.id === fillingReprId)!}
            onClose={() => setFillingReprId(null)}
            onConfirm={(date) => handleSaveReprDate(fillingReprId, date)}
          />
        )}
        {cancellationId && <CancellationModal onConfirm={(reason) => {
          updateStatus(cancellationId, 'Manifesto Cancelado', { Justificativa: reason });
          setCancellationId(null);
        }} onClose={() => setCancellationId(null)} />}
        {loadingMsg && <LoadingOverlay msg={loadingMsg} />}
        {alert && <AlertToast type={alert.type} msg={alert.msg} />}
        <AlertaInspecao activeUser={activeUser} />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#f8fafc] dark:bg-[#0f172a] transition-colors duration-300 custom-scrollbar">
      <header className="bg-[#0f172a] dark:bg-[#020617] text-white border-b-2 border-slate-800 dark:border-slate-900 shadow-2xl shrink-0 z-50 hidden md:block">
        <div className="flex items-center justify-between h-16 px-8">
          <div className="flex items-center gap-4 h-full">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-indigo-600">
                <Terminal size={18} className="text-white" />
              </div>
              <h1 className="text-sm font-black tracking-[0.15em] uppercase">SMO <span className="text-indigo-400 font-normal">v2.5</span></h1>
            </div>
            
            <div className="h-8 w-[1px] bg-slate-700 mx-2" />
            
            <nav className="flex h-full">
              <button onClick={() => setActiveTab('sistema')} className={`group flex items-center justify-center gap-2 w-32 h-16 text-[9px] font-black uppercase tracking-widest transition-all border-b-4 ${activeTab === 'sistema' ? 'border-indigo-500 bg-slate-800/50 text-white' : 'border-transparent text-slate-300 hover:text-white hover:bg-slate-800/30'}`}><LayoutGrid size={13} className={activeTab === 'sistema' ? 'text-indigo-400' : 'text-slate-100'} />CADASTRO</button>
              <button onClick={() => setActiveTab('operacional')} className={`group flex items-center justify-center gap-2 w-32 h-16 text-[9px] font-black uppercase tracking-widest transition-all border-b-4 ${activeTab === 'operacional' ? 'border-red-500 bg-slate-800/50 text-white' : 'border-transparent text-slate-300 hover:text-white hover:bg-slate-800/30'}`}><Plane size={13} className={activeTab === 'operacional' ? 'text-red-400' : 'text-slate-100'} />PUXE</button>
              <button onClick={() => setActiveTab('fluxo')} className={`group flex items-center justify-center gap-2 w-32 h-16 text-[9px] font-black uppercase tracking-widest transition-all border-b-4 ${activeTab === 'fluxo' ? 'border-emerald-500 bg-slate-800/50 text-white' : 'border-transparent text-slate-300 hover:text-white hover:bg-slate-800/30'}`}><Columns size={13} className={activeTab === 'fluxo' ? 'text-emerald-400' : 'text-slate-100'} />FLUXO</button>
              <button onClick={() => setActiveTab('eficiencia')} className={`group flex items-center justify-center gap-2 w-32 h-16 text-[9px] font-black uppercase tracking-widest transition-all border-b-4 ${activeTab === 'eficiencia' ? 'border-yellow-500 bg-slate-800/50 text-white' : 'border-transparent text-slate-300 hover:text-white hover:bg-slate-800/30'}`}><BarChart3 size={13} className={activeTab === 'eficiencia' ? 'text-yellow-400' : 'text-slate-100'} />EFICIÊNCIA</button>
              {canSeeAuditoria && (<button onClick={() => setActiveTab('auditoria')} className={`group flex items-center justify-center gap-2 w-32 h-16 text-[9px] font-black uppercase tracking-widest transition-all border-b-4 ${activeTab === 'auditoria' ? 'border-blue-500 bg-slate-800/50 text-white' : 'border-transparent text-slate-300 hover:text-white hover:bg-slate-800/30'}`}><ClipboardCheck size={13} className={activeTab === 'auditoria' ? 'text-blue-400' : 'text-slate-100'} />AUDITORIA</button>)}
              {canSeeAvaliacao && (<button onClick={() => setActiveTab('avaliacao')} className={`group flex items-center justify-center gap-2 w-32 h-16 text-[9px] font-black uppercase tracking-widest transition-all border-b-4 ${activeTab === 'avaliacao' ? 'border-orange-500 bg-slate-800/50 text-white' : 'border-transparent text-slate-300 hover:text-white hover:bg-slate-800/30'}`}><GraduationCap size={13} className={activeTab === 'avaliacao' ? 'text-orange-400' : 'text-slate-100'} />AVALIAÇÃO</button>)}
            </nav>
          </div>
          
          <div className="flex items-center gap-6">
            <button onClick={() => setDarkMode(!darkMode)} className="p-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-indigo-400 transition-all rounded">{darkMode ? <Sun size={16} /> : <Moon size={16} />}</button>
            <div className="hidden lg:flex items-center gap-3 px-4 py-1.5 bg-slate-800 border border-slate-700">
              <Activity size={14} className={connectionError ? "text-red-400" : "text-emerald-400"} />
              <div className="text-left leading-none">
                <p className="text-[9px] font-bold text-slate-400 uppercase">Supabase Status</p>
                <p className="text-[10px] font-bold text-slate-200">{connectionError ? "Erro de Conexão" : "Online"}</p>
              </div>
            </div>
            {connectionError && (
              <div className="hidden xl:block max-w-[200px] overflow-hidden text-ellipsis whitespace-nowrap bg-red-900/20 border border-red-500/30 px-2 py-1 rounded">
                <p className="text-[8px] text-red-400 font-mono">{connectionError}</p>
              </div>
            )}
            <div className="text-right"><p className="text-[9px] font-black text-indigo-400 uppercase tracking-tighter">Terminal Livre</p><p className="text-[11px] font-bold text-slate-100 uppercase">Acesso Direto</p></div>
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-auto p-6">
        <div className="max-w-[1700px] mx-auto space-y-6">
          {activeTab === 'sistema' ? (
            <Dashboard 
              manifestos={manifestos}
              activeUser={activeUser}
              onSave={async (d) => {
                if (!activeOperatorName) return showAlert('error', 'Sessão expirada. Faça login novamente.');
                setLoadingMsg("Registrando...");
                const id = await fetchNextId();
                const turno = getTurnoAtual();
                const now = getCurrentTimestampBR();
                const { error } = await supabase.from('SMO_Sistema').insert({
                  ID_Manifesto: id,
                  Usuario_Sistema: activeOperatorName,
                  CIA: d.cia,
                  Manifesto_Puxado: d.dataHoraPuxado,
                  Manifesto_Recebido: d.dataHoraRecebido,
                  Status: "Manifesto Recebido",
                  Turno: turno,
                  "Carimbo_Data/HR": now,
                  "Usuario_Ação": activeOperatorName
                });
                if (!error) {
                  supabase.from('SMO_Operacional').insert({
                    ID_Manifesto: id,
                    "Ação": "Manifesto Puxado",
                    Usuario: activeOperatorName,
                    "Created_At_BR": now
                  }).then(({ error: logErr }) => { if (logErr) console.error('Falha ao registrar log operacional:', logErr); });
                  // Adiciona novo manifesto ao estado local sem recarregar tudo
                  setManifestos(prev => [{
                    id, usuario: activeOperatorName!, cia: d.cia,
                    dataHoraPuxado: d.dataHoraPuxado, dataHoraRecebido: d.dataHoraRecebido,
                    status: "Manifesto Recebido", turno, carimboDataHR: now, usuarioAcao: activeOperatorName!,
                  }, ...prev]);
                  showAlert('success', `Registro Concluído (${turno})`);
                } else {
                  showAlert('error', error.message);
                }
                setLoadingMsg(null);
              }}
              onAction={(act, id) => {
                if (act === 'entregar') updateStatus(id, 'Manifesto Entregue');
                else if (act === 'cancelar') setCancellationId(id);
              }}
              openHistory={openHistory}
              openEdit={setEditingId}
              onOpenReprFill={setFillingReprId}
              onShowAlert={showAlert}
              nextId={nextId}
              onLogout={() => handleLogout(true)}
              onOperatorChange={(profile) => setActiveUser(profile)}
            />
          ) : activeTab === 'operacional' ? (
            <OperationalDashboard 
              manifestos={manifestos} 
              onAction={(id, status, fields, operatorName) => {
                updateStatus(id, status, fields, operatorName);
              }} 
              onOpenAssign={setAssignId => setAssigningId(setAssignId)}
            />
          ) : activeTab === 'fluxo' ? (
            <KanbanBoard manifestos={manifestos} isAdmin={isAdmin} />
          ) : activeTab === 'eficiencia' ? (
            <EfficiencyDashboard manifestos={manifestos} activeUser={activeUser} openHistory={openHistory} />
          ) : activeTab === 'auditoria' ? (
            canSeeAuditoria && <SlaAuditor manifestos={manifestos} openHistory={openHistory} />
          ) : (
            canSeeAvaliacao && <AssessmentGuide onShowAlert={showAlert} />
          )}
        </div>
      </main>

      {editingId && (<EditModal data={manifestos.find(m => m.id === editingId)!} onClose={() => setEditingId(null)} onSave={handleSaveEdit} />)}
      {fillingReprId && (<ReprFillModal manifesto={manifestos.find(m => m.id === fillingReprId)!} onClose={() => setFillingReprId(null)} onConfirm={(date) => handleSaveReprDate(fillingReprId, date)} />)}
      {viewingHistoryId && viewingHistoryData && <HistoryModal data={viewingHistoryData} onClose={() => { setViewingHistoryId(null); setViewingHistoryData(null); }} />}
      {cancellationId && <CancellationModal onConfirm={(reason) => { updateStatus(cancellationId, 'Manifesto Cancelado', { Justificativa: reason }); setCancellationId(null); }} onClose={() => setCancellationId(null)} />}
      {assigningId && (<AssignResponsibilityModal manifestoId={assigningId} onConfirm={(name) => { updateStatus(assigningId, 'Manifesto Recebido', { "Usuario_Operação": name }); setAssigningId(null); }} onClose={() => setAssigningId(null)} />)}
      {loadingMsg && <LoadingOverlay msg={loadingMsg} />}
      {alert && <AlertToast type={alert.type} msg={alert.msg} />}
      <AlertaInspecao activeUser={activeUser} />
    </div>
  );
}

export default App;
