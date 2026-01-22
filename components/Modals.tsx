
import React, { useEffect, useState, useRef } from 'react';
import { Manifesto, Funcionario, OperationalLog } from '../types';
import { CustomDateTimePicker } from './CustomDateTimePicker';
import { CustomSelect } from './CustomSelect';
import { UserPlus, Search, UserCheck, Loader2, X, Clock, ClipboardEdit, CheckCircle2, User as UserIcon, MapPin, Activity, Plane, History, MessageSquareQuote, FileText, UserCircle, ShieldAlert } from 'lucide-react';
import { supabase } from '../supabaseClient';

interface EditModalProps {
  data: Manifesto;
  onClose: () => void;
  onSave: (data: Partial<Manifesto> & { id: string, usuario: string, justificativa: string }) => void;
}

// Utility to format ISO strings to DD/MM/YYYY HH:MM
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

// Fix: EditModal implementation
export const EditModal: React.FC<EditModalProps> = ({ data, onClose, onSave }) => {
  const [formData, setFormData] = React.useState({ ...data });
  const [justificativa, setJustificativa] = React.useState('');
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);

  const handleSave = () => {
    if (justificativa.trim().length < 5) { 
      setErrorMsg("Justificativa obrigatória para auditoria (mín. 5 caracteres)."); 
      return; 
    }
    onSave({ 
      id: data.id, 
      usuario: data.usuario, 
      justificativa, 
      cia: formData.cia,
      dataHoraRepresentanteCIA: formData.dataHoraRepresentanteCIA,
      dataHoraEntregue: formData.dataHoraEntregue,
      dataHoraPuxado: formData.dataHoraPuxado,
      dataHoraRecebido: formData.dataHoraRecebido
    });
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 dark:bg-black/80 z-[10000] flex items-start justify-center p-4 pt-[5vh] animate-fadeIn backdrop-blur-sm overflow-y-auto">
      <div className="bg-white dark:bg-slate-800 w-full max-w-xl border-2 border-slate-900 dark:border-slate-700 shadow-2xl flex flex-col mb-10">
        <div className="bg-slate-900 dark:bg-slate-950 text-white p-4 text-[11px] font-black uppercase tracking-widest flex justify-between items-center shrink-0">
          <div className="flex items-center gap-3">
             <ClipboardEdit size={16} className="text-indigo-400" />
             <span>EDITAR MONITORAMENTO: {data.id}</span>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-slate-800 transition-colors"><X size={18} /></button>
        </div>

        <div className="p-6 space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[9px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-tighter">Companhia</label>
              <CustomSelect value={formData.cia} onChange={v => setFormData({...formData, cia: v})} />
            </div>
            <div className="space-y-1.5">
              <label className="text-[9px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-tighter">Status Atual</label>
              <div className="h-10 px-3 bg-slate-50 dark:bg-slate-900/50 border-2 border-slate-100 dark:border-slate-700 flex items-center text-[10px] font-black text-slate-400 uppercase italic">
                {data.status}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 border-t border-slate-100 dark:border-slate-700 pt-6">
            <div className="space-y-1.5">
              <label className="text-[9px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-tighter">Manifesto Puxado</label>
              <CustomDateTimePicker value={formData.dataHoraPuxado || ''} onChange={v => setFormData({...formData, dataHoraPuxado: v})} />
            </div>
            <div className="space-y-1.5">
              <label className="text-[9px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-tighter">Manifesto Recebido</label>
              <CustomDateTimePicker value={formData.dataHoraRecebido || ''} onChange={v => setFormData({...formData, dataHoraRecebido: v})} />
            </div>
          </div>

          <div className="space-y-1.5 border-t border-slate-100 dark:border-slate-700 pt-6">
            <label className="text-[9px] font-black text-slate-900 dark:text-slate-200 uppercase tracking-[0.2em] flex items-center gap-2">
              <MessageSquareQuote size={14} className="text-indigo-600" /> Justificativa da Alteração
            </label>
            <textarea 
              value={justificativa} 
              onChange={e => {
                setJustificativa(e.target.value);
                if (errorMsg) setErrorMsg(null);
              }} 
              placeholder="Descreva o motivo desta alteração manual..."
              className={`w-full h-24 p-3 bg-slate-50 dark:bg-slate-900 border-2 text-xs font-bold dark:text-white outline-none transition-all resize-none ${errorMsg ? 'border-red-500 bg-red-50' : 'border-slate-200 dark:border-slate-700 focus:border-slate-900 dark:focus:border-indigo-500 focus:bg-white dark:focus:bg-slate-900'}`} 
            />
            {errorMsg && <p className="text-[9px] font-black text-red-600 uppercase italic">{errorMsg}</p>}
          </div>
        </div>

        <div className="p-5 bg-slate-50 dark:bg-slate-900 border-t-2 border-slate-100 dark:border-slate-700 flex gap-4">
          <button onClick={onClose} className="flex-1 h-12 border-2 border-slate-300 dark:border-slate-700 text-[11px] font-black uppercase tracking-widest hover:bg-white dark:hover:bg-slate-800 transition-all text-slate-500 dark:text-slate-400">Cancelar</button>
          <button onClick={handleSave} className="flex-1 h-12 bg-slate-900 dark:bg-indigo-600 text-white text-[11px] font-black uppercase tracking-widest hover:bg-indigo-600 transition-all shadow-lg">Salvar</button>
        </div>
      </div>
    </div>
  );
};

// Fix: ReprFillModal implementation
export const ReprFillModal: React.FC<{
  manifesto: Manifesto,
  onClose: () => void,
  onConfirm: (date: string) => void
}> = ({ manifesto, onClose, onConfirm }) => {
  const [date, setDate] = useState(manifesto.dataHoraRepresentanteCIA || '');
  return (
    <div className="fixed inset-0 bg-slate-900/60 dark:bg-black/80 z-[10000] flex items-start justify-center p-4 pt-[15vh] animate-fadeIn backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-800 w-full max-w-sm border-2 border-slate-900 dark:border-slate-700 shadow-2xl flex flex-col">
        <div className="bg-[#0f172a] dark:bg-slate-950 text-white p-3 text-[10px] font-black uppercase tracking-widest flex justify-between items-center">
          <span className="flex items-center gap-2"><Clock size={14} /> REPR. CIA - {manifesto.id}</span>
          <button onClick={onClose} className="p-1 hover:bg-slate-800 transition-colors"><X size={16} /></button>
        </div>
        <div className="p-6 space-y-5">
          <div className="space-y-2">
            <label className="text-[9px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest">Data e Hora da Assinatura</label>
            <CustomDateTimePicker value={date} onChange={setDate} />
          </div>
          <div className="flex gap-3">
            <button onClick={onClose} className="flex-1 h-10 border-2 border-slate-200 dark:border-slate-700 text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all">Sair</button>
            <button disabled={!date} onClick={() => onConfirm(date)} className={`flex-1 h-10 text-white text-[10px] font-black uppercase transition-all shadow-md flex items-center justify-center gap-2 ${date ? 'bg-indigo-600 hover:bg-slate-900 dark:hover:bg-indigo-500' : 'bg-slate-200 dark:bg-slate-700 cursor-not-allowed'}`}>Confirmar</button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Fix: Added missing CancellationModal
export const CancellationModal: React.FC<{ onConfirm: () => void, onClose: () => void }> = ({ onConfirm, onClose }) => {
  return (
    <div className="fixed inset-0 bg-slate-900/60 dark:bg-black/80 z-[10000] flex items-start justify-center p-4 pt-[15vh] animate-fadeIn backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-800 w-full max-w-sm border-2 border-slate-900 dark:border-slate-700 shadow-2xl flex flex-col">
        <div className="bg-red-600 text-white p-3 text-[10px] font-black uppercase tracking-widest flex justify-between items-center">
          <span className="flex items-center gap-2"><ShieldAlert size={14} /> CONFIRMAR CANCELAMENTO</span>
          <button onClick={onClose} className="p-1 hover:bg-red-700 transition-colors"><X size={16} /></button>
        </div>
        <div className="p-6 space-y-5 text-center">
          <p className="text-xs font-bold text-slate-600 dark:text-slate-300">Tem certeza que deseja cancelar este manifesto? Esta ação é irreversível e será registrada no log de auditoria.</p>
          <div className="flex gap-3">
            <button onClick={onClose} className="flex-1 h-10 border-2 border-slate-200 dark:border-slate-700 text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all">Sair</button>
            <button onClick={onConfirm} className="flex-1 h-10 bg-red-600 text-white text-[10px] font-black uppercase hover:bg-slate-900 transition-all shadow-md">Confirmar</button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Fix: Added missing AssignResponsibilityModal
export const AssignResponsibilityModal: React.FC<{ 
  manifestoId: string, 
  onConfirm: (name: string) => void, 
  onClose: () => void 
}> = ({ manifestoId, onConfirm, onClose }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [suggestions, setSuggestions] = useState<Funcionario[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const searchOperator = async () => {
      if (searchTerm.length < 2) {
        setSuggestions([]);
        return;
      }
      setLoading(true);
      try {
        const { data } = await supabase.from('Funcionarios_WFS').select('*').ilike('Nome', `%${searchTerm}%`).eq('Ativo', true).limit(5);
        if (data) setSuggestions(data);
      } catch (e) {
        console.error("Erro ao buscar funcionários", e);
      } finally {
        setLoading(false);
      }
    };
    const delay = setTimeout(searchOperator, 300);
    return () => clearTimeout(delay);
  }, [searchTerm]);

  return (
    <div className="fixed inset-0 bg-slate-900/60 dark:bg-black/80 z-[10000] flex items-start justify-center p-4 pt-[10vh] animate-fadeIn backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-800 w-full max-w-md border-2 border-slate-900 dark:border-slate-700 shadow-2xl flex flex-col">
        <div className="bg-[#0f172a] dark:bg-slate-950 text-white p-4 text-[10px] font-black uppercase tracking-widest flex justify-between items-center">
          <span className="flex items-center gap-2"><UserPlus size={16} /> ATRIBUIR RESPONSÁVEL - {manifestoId}</span>
          <button onClick={onClose} className="p-1 hover:bg-slate-800 transition-colors"><X size={18} /></button>
        </div>
        <div className="p-6 space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input 
              autoFocus
              type="text" 
              placeholder="BUSCAR OPERADOR..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full h-12 pl-10 pr-4 bg-slate-50 dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-700 text-xs font-black uppercase tracking-[0.1em] outline-none focus:border-indigo-600 dark:focus:border-indigo-500 dark:text-white transition-all"
            />
            {loading && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-indigo-600" size={16} />}
          </div>

          <div className="space-y-2 max-h-[250px] overflow-y-auto custom-scrollbar">
            {suggestions.length > 0 ? (
              suggestions.map(s => (
                <button 
                  key={s.id} 
                  onClick={() => onConfirm(s.Nome)}
                  className="w-full p-3 text-left hover:bg-indigo-50 dark:hover:bg-indigo-900/30 flex items-center justify-between border border-slate-100 dark:border-slate-700 rounded transition-colors group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-slate-100 dark:bg-slate-900 flex items-center justify-center rounded-full text-[10px] font-black text-slate-500 uppercase">{s.Nome.charAt(0)}</div>
                    <div>
                      <p className="text-[11px] font-black uppercase text-slate-800 dark:text-slate-200 group-hover:text-indigo-600 dark:group-hover:text-indigo-400">{s.Nome}</p>
                      <p className="text-[8px] font-bold text-slate-400 uppercase">{s.Cargo || 'OPERADOR'}</p>
                    </div>
                  </div>
                  <UserCheck size={14} className="text-slate-300 group-hover:text-indigo-500" />
                </button>
              ))
            ) : searchTerm.length >= 2 && !loading ? (
              <p className="text-center py-4 text-[9px] font-black text-slate-400 uppercase italic">Nenhum operador encontrado</p>
            ) : (
              <p className="text-center py-4 text-[9px] font-black text-slate-300 uppercase italic">Digite para buscar...</p>
            )}
          </div>
        </div>
        <div className="p-4 bg-slate-50 dark:bg-slate-900 border-t border-slate-100 dark:border-slate-700">
           <button onClick={onClose} className="w-full h-10 border-2 border-slate-300 dark:border-slate-700 text-[10px] font-black uppercase text-slate-500 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-800 transition-all">Fechar</button>
        </div>
      </div>
    </div>
  );
};

// Fix: HistoryModal implementation
export const HistoryModal: React.FC<{ data: Manifesto, onClose: () => void }> = ({ data, onClose }) => {
  const [logs, setLogs] = useState<OperationalLog[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);

  useEffect(() => {
    const fetchFullHistory = async () => {
      setLoadingLogs(true);
      try {
        const { data: logData, error } = await supabase.from('SMO_Operacional').select('*').eq('ID_Manifesto', data.id).order('id', { ascending: false });
        if (!error && logData) {
          setLogs(logData.map(l => ({ id: l.id, idManifesto: l.ID_Manifesto, acao: l.Ação, usuario: l.Usuario, justificativa: l.Justificativa, createdAtBR: l.Created_At_BR })));
        }
      } catch (err) { console.error(err); } finally { setLoadingLogs(false); }
    };
    fetchFullHistory();
  }, [data.id]);

  const timelineSteps = [
    { label: 'Manifesto Puxado', time: data.dataHoraPuxado, icon: ClipboardEdit },
    { label: 'Manifesto Recebido', time: data.dataHoraRecebido, icon: MapPin },
    { label: 'Início da Operação', time: data.dataHoraIniciado, icon: Activity },
    { label: 'Operação Finalizada', time: data.dataHoraCompleto, icon: CheckCircle2 },
    { label: 'Assinatura Representante', time: data.dataHoraRepresentanteCIA, icon: Clock },
    { label: 'Manifesto Entregue', time: data.dataHoraEntregue, icon: Plane }
  ];

  return (
    <div className="fixed inset-0 bg-slate-900/60 dark:bg-black/80 z-[10000] flex items-start justify-center p-4 pt-[2vh] animate-fadeIn backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-800 w-full max-w-4xl border-2 border-slate-900 dark:border-slate-700 shadow-2xl flex flex-col max-h-[95vh] mb-4">
        <div className="bg-[#0f172a] dark:bg-slate-950 text-white p-5 flex items-center justify-between border-b-2 border-slate-800 dark:border-slate-900 shrink-0">
          <div className="flex items-center gap-4">
             <div className="p-2 bg-indigo-600">
                <Search size={20} className="text-white" />
             </div>
             <div>
                <h3 className="text-[12px] font-black uppercase tracking-[0.2em]">Rastreabilidade e Log de Auditoria</h3>
                <p className="text-[10px] font-bold text-slate-400 font-mono">MANIFESTO ID: {data.id}</p>
             </div>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-slate-800 transition-colors"><X size={20} /></button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-8 space-y-12 custom-scrollbar">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
             {[
               {label: 'CIA Aérea', val: data.cia}, 
               {label: 'Turno', val: data.turno}, 
               {label: 'Cadastrado por', val: data.usuario},
               {label: 'Manifesto puxado por', val: data.usuarioResponsavel || '---'}
             ].map((item, i) => (
               <div key={i} className="p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg">
                  <p className="text-[8px] font-black text-slate-400 dark:text-slate-500 uppercase mb-1">{item.label}</p>
                  <p className="text-xs font-black text-slate-800 dark:text-slate-200 uppercase">{item.val}</p>
               </div>
             ))}
             <div className="p-3 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800 rounded-lg">
                <p className="text-[8px] font-black text-indigo-400 uppercase mb-1">Status Final</p>
                <span className="text-[9px] font-black text-indigo-700 dark:text-indigo-400 uppercase">{data.status}</span>
             </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
            <div className="lg:col-span-5 space-y-6">
               <h4 className="text-[10px] font-black text-slate-900 dark:text-slate-100 uppercase tracking-widest flex items-center gap-2 border-b border-slate-100 dark:border-slate-700 pb-2">
                  <Clock size={14} className="text-slate-400" /> Fluxo Temporal
               </h4>
               <div className="relative pl-8 space-y-8 before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-[2px] before:bg-slate-100 dark:before:bg-slate-700">
                  {timelineSteps.map((step, idx) => {
                    const hasDate = step.time && step.time !== '---' && step.time !== '';
                    return (
                      <div key={idx} className="relative">
                        <div className={`absolute -left-[30px] top-0 p-1 rounded-full border-2 bg-white dark:bg-slate-800 z-10 ${hasDate ? 'border-indigo-600 text-indigo-600' : 'border-slate-100 dark:border-slate-700 text-slate-300'}`}>
                          <step.icon size={12} />
                        </div>
                        <div className="flex flex-col">
                           <span className={`text-[10px] font-black uppercase tracking-tight ${hasDate ? 'text-slate-800 dark:text-slate-200' : 'text-slate-300 dark:text-slate-600'}`}>{step.label}</span>
                           {hasDate && <span className="text-[10px] font-bold font-mono mt-0.5 text-slate-500 dark:text-slate-400">{formatDisplayDate(step.time)}</span>}
                        </div>
                      </div>
                    );
                  })}
               </div>
            </div>

            <div className="lg:col-span-7 space-y-6">
               <h4 className="text-[10px] font-black text-slate-900 dark:text-slate-100 uppercase tracking-widest flex items-center gap-2 border-b border-slate-100 dark:border-slate-700 pb-2">
                  <History size={14} className="text-indigo-600" /> Histórico de Auditoria
               </h4>
               <div className="bg-slate-50 dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden min-h-[400px]">
                  {loadingLogs ? (
                    <div className="flex flex-col items-center justify-center h-[400px] text-slate-300 gap-3">
                       <Loader2 size={32} className="animate-spin" />
                       <span className="text-[10px] font-black uppercase tracking-widest">Sincronizando...</span>
                    </div>
                  ) : logs.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-[400px] text-slate-300"><FileText size={48} className="opacity-10 mb-2" /><span className="text-[9px] font-bold uppercase italic">Sem registros.</span></div>
                  ) : (
                    <div className="p-4 space-y-4 max-h-[500px] overflow-y-auto custom-scrollbar">
                       {logs.map((log) => (
                         <div key={log.id} className="bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-lg p-3 shadow-sm hover:border-indigo-200 dark:hover:border-indigo-800 transition-colors">
                            <div className="flex justify-between items-start mb-2">
                               <div className="flex items-center gap-2">
                                  <UserCircle size={14} className="text-slate-400" />
                                  <span className="text-[9px] font-black text-slate-600 dark:text-slate-300 uppercase tracking-tighter">{log.usuario}</span>
                               </div>
                               <span className="text-[8px] font-bold text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-slate-900 px-2 py-0.5 rounded-full">{log.createdAtBR}</span>
                            </div>
                            <span className={`text-[9px] font-black px-2 py-0.5 rounded border ${log.acao.includes('Edição') ? 'bg-indigo-50 text-indigo-600 border-indigo-100 dark:bg-indigo-900/20 dark:text-indigo-400 dark:border-indigo-800/50' : 'bg-slate-50 text-slate-600 border-slate-100 dark:bg-slate-900 dark:text-slate-400 dark:border-slate-700'} uppercase`}>{log.acao}</span>
                            {log.justificativa && <div className="mt-2 p-2 bg-indigo-50/50 dark:bg-indigo-900/10 border-l-4 border-indigo-400"><p className="text-[10px] font-bold text-slate-700 dark:text-slate-300 italic">"{log.justificativa}"</p></div>}
                         </div>
                       ))}
                    </div>
                  )}
               </div>
            </div>
          </div>
        </div>

        <div className="p-6 border-t border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 flex justify-between items-center shrink-0">
          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Base de Dados: <span className="font-black text-slate-900 dark:text-slate-200">Hostinger SMO v2.5</span></p>
          <button onClick={onClose} className="h-11 px-10 bg-slate-900 dark:bg-indigo-600 text-white text-[10px] font-black uppercase tracking-[0.2em] hover:bg-indigo-600 dark:hover:bg-indigo-500 transition-all shadow-xl">Fechar Relatório</button>
        </div>
      </div>
    </div>
  );
};

// Fix: LoadingOverlay implementation
export const LoadingOverlay: React.FC<{ msg: string }> = ({ msg }) => (
  <div className="fixed inset-0 bg-white/80 dark:bg-slate-900/80 z-[10002] flex flex-col items-center justify-center animate-fadeIn backdrop-blur-sm">
    <div className="w-8 h-8 border-4 border-zinc-200 dark:border-slate-700 border-t-zinc-900 dark:border-t-indigo-500 animate-spin mb-2"></div>
    <div className="text-[10px] font-black text-zinc-900 dark:text-indigo-400 uppercase tracking-[0.2em]">{msg}</div>
  </div>
);

// Fix: AlertToast implementation
export const AlertToast: React.FC<{ type: 'success' | 'error', msg: string }> = ({ type, msg }) => (
  <div className={`fixed bottom-4 right-4 text-white px-4 py-3 shadow-2xl font-bold text-[10px] uppercase tracking-widest z-[10001] animate-slideInUp ${type === 'success' ? 'bg-emerald-600' : 'bg-red-600'}`}>
    {msg}
  </div>
);
