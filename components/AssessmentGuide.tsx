
import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabaseClient';
import { Funcionario } from '../types';
import { 
  GraduationCap, 
  FileText, 
  PieChart, 
  Search, 
  ArrowRight, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  Trophy,
  Loader2,
  X,
  User as UserIcon
} from 'lucide-react';

interface AssessmentGuideProps {
  onShowAlert: (type: 'success' | 'error', msg: string) => void;
}

interface Question {
  id: number;
  text: string;
  options: string[];
  correct: number;
}

const QUESTIONS: Question[] = [
  {
    id: 1,
    text: "Qual o tempo limite (SLA) para a apresentação da carga pela CIA após ser puxada no sistema?",
    options: ["5 Minutos", "10 Minutos", "15 Minutos", "20 Minutos"],
    correct: 1
  },
  {
    id: 2,
    text: "Qual o tempo máximo recomendado pela WFS para finalizar o processamento total de um manifesto?",
    options: ["1 Hora", "2 Horas", "3 Horas", "4 Horas"],
    correct: 1
  },
  {
    id: 3,
    text: "Após a finalização do manifesto (WFS), em quanto tempo o representante da CIA deve assinar?",
    options: ["Imediatamente", "10 Minutos", "15 Minutos", "30 Minutos"],
    correct: 2
  },
  {
    id: 4,
    text: "Qual documento/ação é obrigatório registrar antes de realizar a 'Entrega' de um manifesto?",
    options: ["Identidade do Motorista", "Assinatura/Data do Repr. CIA", "Foto da Carga", "Conferência Cega"],
    correct: 1
  },
  {
    id: 5,
    text: "O que significa o status 'Manifesto Iniciado' no sistema?",
    options: ["Carga recebida no pátio", "Operador iniciou o processo de puxe/conferência", "Manifesto impresso", "Carga entregue ao cliente"],
    correct: 1
  },
  {
    id: 6,
    text: "Em qual guia o administrador gera o link externo de monitoramento para monitores/TVs?",
    options: ["Cadastro", "Puxe", "Fluxo", "Eficiência"],
    correct: 2
  },
  {
    id: 7,
    text: "Quantos turnos operacionais existem no sistema SMO padrão?",
    options: ["1 Turno", "2 Turnos", "3 Turnos", "4 Turnos"],
    correct: 2
  },
  {
    id: 8,
    text: "Qual a cor do status de SLA Crítico (Vencido) no Kanban de Fluxo?",
    options: ["Amarelo", "Azul", "Verde", "Vermelho"],
    correct: 3
  },
  {
    id: 9,
    text: "Onde é possível consultar a rastreabilidade completa e logs de auditoria de um manifesto?",
    options: ["Painel Principal", "Dossiê/Detalhes do Log", "Aba Eficiência", "Não é possível consultar"],
    correct: 1
  },
  {
    id: 10,
    text: "Qual o prefixo padrão dos IDs de manifesto no ano de 2026?",
    options: ["WFS-26", "SMO-26", "MAO-26", "CIA-26"],
    correct: 2
  }
];

export const AssessmentGuide: React.FC<AssessmentGuideProps> = ({ onShowAlert }) => {
  const [activeSubTab, setActiveSubTab] = useState<'prova' | 'relatorio'>('prova');
  const [operator, setOperator] = useState<Funcionario | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [suggestions, setSuggestions] = useState<Funcionario[]>([]);
  const [loading, setLoading] = useState(false);
  const [quizStarted, setQuizStarted] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<number[]>([]);
  const [quizFinished, setQuizFinished] = useState(false);
  const [userResult, setUserResult] = useState<any>(null);
  const [reportData, setReportData] = useState<any[]>([]);
  
  const searchRef = useRef<HTMLDivElement>(null);

  // Fechar sugestões ao clicar fora
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setSuggestions([]);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Carregar dados de relatório
  useEffect(() => {
    if (activeSubTab === 'relatorio') {
      fetchReport();
    }
  }, [activeSubTab]);

  const fetchReport = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.from('SMO_Avaliacoes').select('*').order('created_at', { ascending: false });
      if (data) setReportData(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

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
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const delay = setTimeout(searchOperator, 300);
    return () => clearTimeout(delay);
  }, [searchTerm]);

  const startQuiz = async () => {
    if (!operator) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase.from('SMO_Avaliacoes').select('*').eq('Nome_Funcionario', operator.Nome).single();
      
      if (data && data.Tentativa_3 !== null) {
        onShowAlert('error', 'Limite de 3 tentativas atingido para este operador.');
        setLoading(false);
        return;
      }
      
      setUserResult(data || { Nome_Funcionario: operator.Nome, Cargo: operator.Cargo || 'OPERADOR' });
      setQuizStarted(true);
      setAnswers([]);
      setCurrentQuestion(0);
      setQuizFinished(false);
    } catch (e) {
      setUserResult({ Nome_Funcionario: operator.Nome, Cargo: operator.Cargo || 'OPERADOR' });
      setQuizStarted(true);
      setAnswers([]);
      setCurrentQuestion(0);
      setQuizFinished(false);
    } finally {
      setLoading(false);
    }
  };

  const handleAnswer = (optionIdx: number) => {
    const newAnswers = [...answers, optionIdx];
    setAnswers(newAnswers);
    
    if (currentQuestion < QUESTIONS.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
    } else {
      finishQuiz(newAnswers);
    }
  };

  const finishQuiz = async (finalAnswers: number[]) => {
    let score = 0;
    finalAnswers.forEach((ans, idx) => {
      if (ans === QUESTIONS[idx].correct) score++;
    });

    setQuizFinished(true);
    const now = new Date().toLocaleString('pt-BR');
    const updateData: any = { ...userResult };

    if (updateData.Tentativa_1 === undefined || updateData.Tentativa_1 === null) {
      updateData.Tentativa_1 = score;
      updateData.Data_Tentativa_1 = now;
    } else if (updateData.Tentativa_2 === undefined || updateData.Tentativa_2 === null) {
      updateData.Tentativa_2 = score;
      updateData.Data_Tentativa_2 = now;
    } else {
      updateData.Tentativa_3 = score;
      updateData.Data_Tentativa_3 = now;
    }

    const bestScore = Math.max(updateData.Tentativa_1 || 0, updateData.Tentativa_2 || 0, updateData.Tentativa_3 || 0);
    updateData.Status = bestScore >= 7 ? 'APROVADO' : 'REPROVADO';

    try {
      const { error } = await supabase.from('SMO_Avaliacoes').upsert(updateData, { onConflict: 'Nome_Funcionario' });
      if (error) throw error;
      onShowAlert('success', `Avaliação Finalizada! Pontuação: ${score}/10`);
    } catch (e) {
      console.error(e);
      onShowAlert('error', 'Erro ao salvar resultado.');
    }
  };

  return (
    <div className="flex flex-col gap-6 animate-fadeIn h-full">
      <div className="bg-[#0f172a] dark:bg-[#020617] border-2 border-slate-800 dark:border-slate-900 p-4 flex items-center justify-between shadow-lg shrink-0">
        <div className="flex items-center gap-4">
          <div className="p-2 bg-yellow-600 rounded">
            <GraduationCap size={20} className="text-white" />
          </div>
          <div>
            <h2 className="text-[14px] font-black text-white uppercase tracking-[0.2em]">Guia de Qualificação Operacional</h2>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Treinamento e Avaliação Técnica SMO v2.5</p>
          </div>
        </div>

        <div className="flex h-10 border border-slate-700 bg-slate-900/50 p-1">
           <button 
            onClick={() => { setActiveSubTab('prova'); setQuizStarted(false); setQuizFinished(false); }}
            className={`px-4 text-[9px] font-black uppercase tracking-widest transition-all ${activeSubTab === 'prova' ? 'bg-indigo-600 text-white' : 'text-slate-500 hover:text-slate-300'}`}
           >
             <FileText size={12} className="inline mr-2" /> Realizar Prova
           </button>
           <button 
            onClick={() => setActiveSubTab('relatorio')}
            className={`px-4 text-[9px] font-black uppercase tracking-widest transition-all ${activeSubTab === 'relatorio' ? 'bg-indigo-600 text-white' : 'text-slate-500 hover:text-slate-300'}`}
           >
             <PieChart size={12} className="inline mr-2" /> Relatório Geral
           </button>
        </div>
      </div>

      <div className={`flex-1 bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 panel-shadow flex flex-col ${activeSubTab === 'prova' && !quizStarted ? 'overflow-visible' : 'overflow-hidden'}`}>
        {activeSubTab === 'prova' ? (
          <div className="flex-1 p-10 flex flex-col items-center justify-center relative">
            {!operator ? (
              <div className="max-w-md w-full animate-fadeIn relative" ref={searchRef}>
                 <div className="text-center mb-8">
                    <UserIcon size={48} className="mx-auto text-slate-300 mb-4" />
                    <h3 className="text-lg font-black uppercase tracking-widest text-slate-900 dark:text-white">Identificação do Candidato</h3>
                    <p className="text-[10px] font-bold text-slate-400 uppercase">Selecione seu nome na lista oficial WFS</p>
                 </div>
                 <div className="relative z-[100]">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                    <input 
                      type="text" 
                      placeholder="DIGITE SEU NOME..." 
                      value={searchTerm}
                      onChange={e => setSearchTerm(e.target.value)}
                      className="w-full h-16 pl-14 pr-4 bg-slate-50 dark:bg-slate-900 border-2 border-slate-900 dark:border-slate-700 text-xs font-black uppercase tracking-widest outline-none focus:border-indigo-600 dark:text-white transition-all shadow-inner"
                    />
                    {loading && <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 animate-spin text-indigo-600" />}
                    
                    {suggestions.length > 0 && (
                      <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-slate-900 border-2 border-slate-950 dark:border-slate-700 shadow-[0_20px_50px_rgba(0,0,0,0.3)] z-[1000] overflow-hidden rounded-sm">
                        {suggestions.map(s => (
                          <button 
                            key={s.id} 
                            onClick={() => { setOperator(s); setSearchTerm(''); setSuggestions([]); }}
                            className="w-full p-4 text-left hover:bg-indigo-600 dark:hover:bg-indigo-900/50 flex items-center justify-between border-b border-slate-100 dark:border-slate-800 last:border-0 group transition-colors"
                          >
                             <div className="flex flex-col">
                                <span className="text-[11px] font-black uppercase text-slate-800 dark:text-slate-100 group-hover:text-white">{s.Nome}</span>
                                <span className="text-[8px] font-bold text-slate-400 uppercase group-hover:text-indigo-200">{s.Cargo || 'OPERADOR'}</span>
                             </div>
                             <ArrowRight size={14} className="text-slate-300 group-hover:text-white transition-transform group-hover:translate-x-1" />
                          </button>
                        ))}
                      </div>
                    )}
                 </div>
              </div>
            ) : !quizStarted ? (
              <div className="max-w-lg w-full bg-slate-50 dark:bg-slate-900 p-8 border-2 border-slate-900 dark:border-slate-700 text-center animate-fadeIn shadow-2xl">
                <div className="w-20 h-20 bg-indigo-600 mx-auto mb-6 flex items-center justify-center text-white text-3xl font-black rounded-full shadow-lg border-4 border-white dark:border-slate-800">
                  {operator.Nome.charAt(0)}
                </div>
                <h3 className="text-xl font-black uppercase text-slate-900 dark:text-white mb-1">{operator.Nome}</h3>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-8">{operator.Cargo || 'OPERADOR LOGÍSTICO'}</p>
                
                <div className="grid grid-cols-2 gap-4 mb-8">
                   <div className="bg-white dark:bg-slate-800 p-3 border border-slate-200 dark:border-slate-700 rounded shadow-sm">
                      <p className="text-[9px] font-black text-slate-400 uppercase mb-1">Nota de Corte</p>
                      <p className="text-xl font-black text-emerald-600">7.0 / 10</p>
                   </div>
                   <div className="bg-white dark:bg-slate-800 p-3 border border-slate-200 dark:border-slate-700 rounded shadow-sm">
                      <p className="text-[9px] font-black text-slate-400 uppercase mb-1">Questões</p>
                      <p className="text-xl font-black text-indigo-600">10 Itens</p>
                   </div>
                </div>

                <div className="text-left bg-indigo-50 dark:bg-indigo-900/20 p-4 border-l-4 border-indigo-600 mb-8">
                   <p className="text-[10px] font-bold text-indigo-800 dark:text-indigo-300 leading-relaxed italic">
                     "Esta avaliação visa garantir o pleno domínio do sistema SMO v2.5. Você possui 3 tentativas. O registro de tempo será utilizado para fins de auditoria e integridade."
                   </p>
                </div>

                <div className="flex gap-4">
                  <button onClick={() => setOperator(null)} className="flex-1 h-12 border-2 border-slate-300 dark:border-slate-700 text-[11px] font-black uppercase tracking-widest hover:bg-white dark:hover:bg-slate-800 transition-all text-slate-500">Trocar Nome</button>
                  <button onClick={startQuiz} className="flex-1 h-12 bg-indigo-600 text-white text-[11px] font-black uppercase tracking-widest hover:bg-slate-950 transition-all shadow-xl">Iniciar Avaliação</button>
                </div>
              </div>
            ) : quizFinished ? (
              <div className="max-w-md w-full text-center animate-fadeIn">
                {Math.max(answers.filter((a,i) => a === QUESTIONS[i].correct).length) >= 7 ? (
                   <div className="mb-6">
                      <div className="w-24 h-24 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 mx-auto rounded-full flex items-center justify-center mb-4">
                         <Trophy size={48} />
                      </div>
                      <h3 className="text-2xl font-black uppercase text-emerald-600">APROVADO</h3>
                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Parabéns pelo excelente desempenho!</p>
                   </div>
                ) : (
                  <div className="mb-6">
                      <div className="w-24 h-24 bg-red-100 dark:bg-red-900/30 text-red-600 mx-auto rounded-full flex items-center justify-center mb-4">
                         <AlertCircle size={48} />
                      </div>
                      <h3 className="text-2xl font-black uppercase text-red-600">REPROVADO</h3>
                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Revise os processos e tente novamente.</p>
                   </div>
                )}
                
                <div className="bg-slate-50 dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-700 p-8 rounded-xl mb-8">
                   <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2">Sua Pontuação Final</p>
                   <p className="text-6xl font-black text-slate-900 dark:text-white font-mono-tech">{answers.filter((a,i) => a === QUESTIONS[i].correct).length}<span className="text-2xl text-slate-300">/10</span></p>
                </div>

                <button onClick={() => { setQuizStarted(false); setQuizFinished(false); setOperator(null); }} className="w-full h-14 bg-slate-900 dark:bg-indigo-600 text-white font-black uppercase text-xs tracking-widest hover:bg-indigo-700 transition-all shadow-xl">Voltar ao Início</button>
              </div>
            ) : (
              <div className="max-w-2xl w-full animate-fadeIn">
                <div className="flex justify-between items-center mb-8">
                   <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-indigo-600 text-white flex items-center justify-center text-sm font-black rounded">{currentQuestion + 1}</div>
                      <div>
                         <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">Questão</p>
                         <p className="text-[12px] font-bold text-slate-400 uppercase">Progresso: {Math.round(((currentQuestion + 1) / QUESTIONS.length) * 100)}%</p>
                      </div>
                   </div>
                   <div className="text-right">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Candidato</p>
                      <p className="text-[12px] font-black text-slate-900 dark:text-white uppercase">{operator.Nome}</p>
                   </div>
                </div>

                <h4 className="text-xl font-black text-slate-800 dark:text-slate-100 mb-10 leading-snug">
                  {QUESTIONS[currentQuestion].text}
                </h4>

                <div className="grid grid-cols-1 gap-3">
                   {QUESTIONS[currentQuestion].options.map((opt, idx) => (
                     <button 
                      key={idx} 
                      onClick={() => handleAnswer(idx)}
                      className="w-full p-5 text-left border-2 border-slate-100 dark:border-slate-700 hover:border-indigo-600 dark:hover:border-indigo-500 bg-white dark:bg-slate-900 group transition-all flex items-center justify-between"
                     >
                        <span className="text-sm font-bold text-slate-700 dark:text-slate-300 group-hover:text-indigo-600 dark:group-hover:text-indigo-400">{opt}</span>
                        <div className="w-6 h-6 rounded-full border-2 border-slate-200 dark:border-slate-700 group-hover:border-indigo-600 transition-all"></div>
                     </button>
                   ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="flex-1 p-6 flex flex-col gap-6 overflow-hidden">
             <div className="grid grid-cols-1 md:grid-cols-3 gap-6 shrink-0">
                <div className="bg-emerald-50 dark:bg-emerald-900/20 p-5 border-2 border-emerald-100 dark:border-emerald-800 rounded-xl">
                   <p className="text-[11px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest mb-1">Aproveitamento Geral</p>
                   <p className="text-3xl font-black text-emerald-700 dark:text-emerald-300">
                     {reportData.length > 0 ? `${Math.round((reportData.filter(r => r.Status === 'APROVADO').length / reportData.length) * 100)}%` : '0%'}
                   </p>
                </div>
                <div className="bg-indigo-50 dark:bg-indigo-900/20 p-5 border-2 border-indigo-100 dark:border-indigo-800 rounded-xl">
                   <p className="text-[11px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest mb-1">Média de Acertos</p>
                   <p className="text-3xl font-black text-indigo-700 dark:text-indigo-300">
                     {reportData.length > 0 ? (reportData.reduce((acc, curr) => acc + Math.max(curr.Tentativa_1 || 0, curr.Tentativa_2 || 0, curr.Tentativa_3 || 0), 0) / reportData.length).toFixed(1) : '0.0'}
                   </p>
                </div>
                <div className="bg-slate-50 dark:bg-slate-900/50 p-5 border-2 border-slate-200 dark:border-slate-700 rounded-xl">
                   <p className="text-[11px] font-black text-slate-500 uppercase tracking-widest mb-1">Total Avaliados</p>
                   <p className="text-3xl font-black text-slate-900 dark:text-white">{reportData.length}</p>
                </div>
             </div>

             <div className="flex-1 bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden flex flex-col">
                <div className="bg-slate-900 dark:bg-black p-4 flex items-center justify-between">
                   <h4 className="text-[11px] font-black text-white uppercase tracking-widest flex items-center gap-2">
                     <Trophy size={14} className="text-yellow-500" /> Leaderboard de Performance
                   </h4>
                   <span className="text-[9px] font-bold text-slate-500 uppercase">Classificação por Melhor Nota</span>
                </div>
                <div className="flex-1 overflow-y-auto custom-scrollbar">
                   <table className="w-full text-left border-collapse">
                      <thead>
                         <tr className="bg-slate-50 dark:bg-slate-950 border-b border-slate-100 dark:border-slate-800 sticky top-0 z-10">
                            <th className="p-4 text-[10px] font-black text-slate-400 uppercase">Pos</th>
                            <th className="p-4 text-[10px] font-black text-slate-400 uppercase">Operador</th>
                            <th className="p-4 text-[10px] font-black text-slate-400 uppercase text-center">T1</th>
                            <th className="p-4 text-[10px] font-black text-slate-400 uppercase text-center">T2</th>
                            <th className="p-4 text-[10px] font-black text-slate-400 uppercase text-center">T3</th>
                            <th className="p-4 text-[10px] font-black text-slate-400 uppercase text-center">Melhor</th>
                            <th className="p-4 text-[10px] font-black text-slate-400 uppercase text-right">Status</th>
                         </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                         {reportData
                           .sort((a,b) => Math.max(b.Tentativa_1||0, b.Tentativa_2||0, b.Tentativa_3||0) - Math.max(a.Tentativa_1||0, a.Tentativa_2||0, a.Tentativa_3||0))
                           .map((r, idx) => {
                           const best = Math.max(r.Tentativa_1 || 0, r.Tentativa_2 || 0, r.Tentativa_3 || 0);
                           return (
                             <tr key={r.id} className="hover:bg-slate-50 dark:hover:bg-indigo-900/10 transition-colors group">
                                <td className="p-4">
                                   <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-black ${idx === 0 ? 'bg-yellow-500 text-white' : idx === 1 ? 'bg-slate-400 text-white' : idx === 2 ? 'bg-amber-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'}`}>
                                      {idx + 1}
                                   </div>
                                </td>
                                <td className="p-4">
                                   <p className="text-[12px] font-black text-slate-800 dark:text-slate-200 uppercase group-hover:text-indigo-600">{r.Nome_Funcionario}</p>
                                   <p className="text-[9px] font-bold text-slate-400 uppercase">{r.Cargo || 'OPERADOR'}</p>
                                </td>
                                <td className="p-4 text-center font-mono-tech text-[11px] text-slate-400">{r.Tentativa_1 ?? '-'}</td>
                                <td className="p-4 text-center font-mono-tech text-[11px] text-slate-400">{r.Tentativa_2 ?? '-'}</td>
                                <td className="p-4 text-center font-mono-tech text-[11px] text-slate-400">{r.Tentativa_3 ?? '-'}</td>
                                <td className="p-4 text-center">
                                   <span className={`text-[12px] font-black font-mono-tech ${best >= 7 ? 'text-emerald-600' : 'text-red-500'}`}>{best}/10</span>
                                </td>
                                <td className="p-4 text-right">
                                   <span className={`text-[9px] font-black px-2 py-1 rounded uppercase tracking-tighter ${r.Status === 'APROVADO' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400' : 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400'}`}>
                                      {r.Status}
                                   </span>
                                </td>
                             </tr>
                           );
                         })}
                      </tbody>
                   </table>
                </div>
             </div>
          </div>
        )}
      </div>

      <div className="bg-slate-50 dark:bg-slate-900 p-3 border-2 border-slate-200 dark:border-slate-700 flex items-center justify-between">
         <div className="flex items-center gap-2">
            <Clock size={14} className="text-slate-400" />
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Sincronização em Tempo Real com Hostinger SMO</span>
         </div>
         <span className="text-[9px] font-black text-slate-400 uppercase italic">Desenvolvido para Qualificação Técnica WFS Ground Handling</span>
      </div>
    </div>
  );
};
