
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
  User as UserIcon,
  ChevronRight
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

// Lista oficial completa (115 Funcionários)
const STATIC_EMPLOYEES: Funcionario[] = [
  { id: 1001, Nome: "DIEGO NEVES DA SILVA", Cargo: "LIDER", Ativo: true },
  { id: 1002, Nome: "HELIO PEREIRA ANDRADE JUNIOR", Cargo: "LIDER", Ativo: true },
  { id: 1003, Nome: "PEDRO HEANES PINTO DE SOUZA", Cargo: "LIDER", Ativo: true },
  { id: 1004, Nome: "RODRIGO DE ALMEIDA", Cargo: "LIDER", Ativo: true },
  { id: 1005, Nome: "GUSTAVO HENRIQUE LIMA DA SILVA", Cargo: "LIDER", Ativo: true },
  { id: 1006, Nome: "ANDRE PEREIRA BENTES", Cargo: "AUX", Ativo: true },
  { id: 1007, Nome: "IVANETE MOURA MEDEIROS", Cargo: "AUX", Ativo: true },
  { id: 1008, Nome: "MARCELO RODRIGUES PAES", Cargo: "AUX", Ativo: true },
  { id: 1009, Nome: "EDIMARA BRAGA CAMPOS", Cargo: "AUX", Ativo: true },
  { id: 1010, Nome: "FRANCISCO EDGAR DA SILVA COSTA", Cargo: "AUX", Ativo: true },
  { id: 1011, Nome: "ALYSSON DOS SANTOS PAES", Cargo: "AUX", Ativo: true },
  { id: 1012, Nome: "JOSE RAIMUNDO MELO GOMES", Cargo: "AUX", Ativo: true },
  { id: 1013, Nome: "WENDEL ALVES BALIEIRO", Cargo: "AUX", Ativo: true },
  { id: 1014, Nome: "DENIS CO SARMENTO", Cargo: "AUX", Ativo: true },
  { id: 1015, Nome: "SEVERINO ALMEIDA DE OLIVEIRA", Cargo: "AUX", Ativo: true },
  { id: 1016, Nome: "PEDRO GAMA DE MIRANDA", Cargo: "AUX", Ativo: true },
  { id: 1017, Nome: "ADRIANO MIRANDA DE FREITAS", Cargo: "AUX", Ativo: true },
  { id: 1018, Nome: "WALTER MONTEIRO PEREIRA", Cargo: "AUX", Ativo: true },
  { id: 1019, Nome: "MARCIO DOS SANTOS NASCIMENTO", Cargo: "AUX", Ativo: true },
  { id: 1020, Nome: "VANDERLEY DA SILVA TORRES", Cargo: "AUX", Ativo: true },
  { id: 1021, Nome: "RUSIVALDO CARDOSO QUEIROZ", Cargo: "AUX", Ativo: true },
  { id: 1022, Nome: "DIHEGO CAMPOS FIGUEIREDO", Cargo: "AUX", Ativo: true },
  { id: 1023, Nome: "MARCOS ANTONIO MENDES DE OLIVEIRA", Cargo: "AUX", Ativo: true },
  { id: 1024, Nome: "ROSANA PRADO MEDEIROS", Cargo: "AUX", Ativo: true },
  { id: 1025, Nome: "CARLOS EDUARDO MERUOCA RUNA", Cargo: "AUX", Ativo: true },
  { id: 1026, Nome: "JOSINEY MACHADO DE MELO", Cargo: "AUX", Ativo: true },
  { id: 1027, Nome: "ULISSES ALMEIDA LOPES JUNIOR", Cargo: "AUX", Ativo: true },
  { id: 1028, Nome: "CARLOS ALBERTO DA SILVA GONÇALVES", Cargo: "OP.EQUIP", Ativo: true },
  { id: 1029, Nome: "RAIMUNDO NONATO GONÇALVES P SILVA", Cargo: "OP.EQUIP", Ativo: true },
  { id: 1030, Nome: "EDIVAN ALVES SARGES", Cargo: "OP.EQUIP", Ativo: true },
  { id: 1031, Nome: "VANESSA CARDOSO MAQUINÉ", Cargo: "OP.EQUIP", Ativo: true },
  { id: 1032, Nome: "LUCIANO DO VALE DA SILVA SANTOS", Cargo: "OP.EQUIP", Ativo: true },
  { id: 1033, Nome: "VANDEMBERG FLORES DAMASCENO", Cargo: "OP.EQUIP", Ativo: true },
  { id: 1034, Nome: "ALEXANDRE SILVA DOS ANJOS", Cargo: "OP.EQUIP", Ativo: true },
  { id: 1035, Nome: "JACKSON SILVA DOS SANTOS", Cargo: "OP.EQUIP", Ativo: true },
  { id: 1036, Nome: "DANIEL MARTINS SARMENTO", Cargo: "AUX", Ativo: true },
  { id: 1037, Nome: "PATRICIA GOMES DA SILVA", Cargo: "AUX", Ativo: true },
  { id: 1038, Nome: "SIDNEY MARIANO DE SOUZA", Cargo: "AUX", Ativo: true },
  { id: 1039, Nome: "LINIKER DE SOUZA PALHETA", Cargo: "AUX", Ativo: true },
  { id: 1040, Nome: "EDCARLOS FERNANDES RODRIGUES", Cargo: "AUX", Ativo: true },
  { id: 1041, Nome: "RENIER LUCIO DE LIMA", Cargo: "AUX", Ativo: true },
  { id: 1042, Nome: "ANTONIO FREDERICO DA SILVA", Cargo: "AUX", Ativo: true },
  { id: 1043, Nome: "IZAQUE ALVES DE OLIVEIRA", Cargo: "AUX", Ativo: true },
  { id: 1044, Nome: "WALDEMAR FERREIRA DA SILVA", Cargo: "AUX", Ativo: true },
  { id: 1045, Nome: "HERIC MASLOWN DA COSTA AZEVEDO", Cargo: "AUX", Ativo: true },
  { id: 1046, Nome: "WILMA APARECIDA PEREIRA DA SILVA BRITO", Cargo: "AUX", Ativo: true },
  { id: 1047, Nome: "EMERSON ACÁCIO GUEDES", Cargo: "AUX", Ativo: true },
  { id: 1048, Nome: "IAGO FELIPE MELO GADELHA", Cargo: "AUX", Ativo: true },
  { id: 1049, Nome: "CLAUDIA CRISTIANE DE ARAUJO FROIS", Cargo: "AUX", Ativo: true },
  { id: 1050, Nome: "FRANK NASCIMENTO EVANGELISTA", Cargo: "AUX", Ativo: true },
  { id: 1051, Nome: "EMANUEL RAMALHO", Cargo: "AUX", Ativo: true },
  { id: 1052, Nome: "FABULO SANTOS DA SILVA", Cargo: "AUX", Ativo: true },
  { id: 1053, Nome: "MARCELE GOMES DAS CHAGAS", Cargo: "AUX", Ativo: true },
  { id: 1054, Nome: "RAFAEL RIBEIRO AZEVEDO", Cargo: "AUX", Ativo: true },
  { id: 1055, Nome: "ALINA DAS NEVES PERINI", Cargo: "AUX", Ativo: true },
  { id: 1056, Nome: "LEANDRO DE SOUZA PALHETA", Cargo: "AUX", Ativo: true },
  { id: 1057, Nome: "FRANK DOS SANTOS RIBEIRO", Cargo: "AUX", Ativo: true },
  { id: 1058, Nome: "ERIMAR COSTA DA SILVA", Cargo: "AUX", Ativo: true },
  { id: 1059, Nome: "MARIO JORGE VIANA LOPES JUNIOR", Cargo: "AUX", Ativo: true },
  { id: 1060, Nome: "GILMAR FREITAS LALOR", Cargo: "AUX", Ativo: true },
  { id: 1061, Nome: "EDSON DE SOUZA OLIVEIRA", Cargo: "AUX", Ativo: true },
  { id: 1062, Nome: "ALEXANDRE SOUZA DA COSTA", Cargo: "AUX", Ativo: true },
  { id: 1063, Nome: "ANTONIO WILSON DOS SANTOS LEITÃO", Cargo: "AUX", Ativo: true },
  { id: 1064, Nome: "ALTAIR DA ENCARNACAO PIRES", Cargo: "AUX", Ativo: true },
  { id: 1065, Nome: "FERNANDO HELION ALVES MENDONÇA", Cargo: "AUX", Ativo: true },
  { id: 1066, Nome: "FABIO FEITOZA DA SILVA", Cargo: "AUX", Ativo: true },
  { id: 1067, Nome: "CAIQUE ROGGER GOMES BARBOSA", Cargo: "AUX", Ativo: true },
  { id: 1068, Nome: "PABLO YURI SIMAS DA SILVA", Cargo: "AUX", Ativo: true },
  { id: 1069, Nome: "JOÃO PAIXÃO PEREIRA CARRIL", Cargo: "AUX", Ativo: true },
  { id: 1070, Nome: "MARCIO RENE LIMA DA SILVA", Cargo: "AUX", Ativo: true },
  { id: 1071, Nome: "FRANCISCO JOSINALDO SILVA BARBOSA", Cargo: "AUX", Ativo: true },
  { id: 1072, Nome: "MARLON DA SILVA BRAGA", Cargo: "AUX", Ativo: true },
  { id: 1073, Nome: "RODRIGO RICARDO COSTA PINHEIRO", Cargo: "AUX", Ativo: true },
  { id: 1074, Nome: "JOEL DA SILVA DOS SANTOS JUNIOR", Cargo: "AUX", Ativo: true },
  { id: 1075, Nome: "DARLISON SOUSA DE MELO", Cargo: "AUX", Ativo: true },
  { id: 1076, Nome: "CARLOS AUGUSTO SOUSA DE MORAES", Cargo: "AUX", Ativo: true },
  { id: 1077, Nome: "DAVID DE CASTRO REIS", Cargo: "AUX", Ativo: true },
  { id: 1078, Nome: "EDER LINHARES DO NASCIMENTO", Cargo: "AUX", Ativo: true },
  { id: 1079, Nome: "OSCAR HAYDEN FILHO", Cargo: "AUX", Ativo: true },
  { id: 1080, Nome: "FRANCISCO EVALDO DUARTE MOUTA", Cargo: "AUX", Ativo: true },
  { id: 1081, Nome: "JOSE DIDIMO NASCIMENTO", Cargo: "AUX", Ativo: true },
  { id: 1082, Nome: "ADEMIR BEZERRA DE MELO", Cargo: "AUX", Ativo: true },
  { id: 1083, Nome: "MARCOS DE SOUZA FIGUEIREDO", Cargo: "AUX", Ativo: true },
  { id: 1084, Nome: "GILVAN PINTO DE SOUZA", Cargo: "AUX", Ativo: true },
  { id: 1085, Nome: "ADRYA PATRICIA DA SILVA FERREIRA", Cargo: "AUX", Ativo: true },
  { id: 1086, Nome: "MATHEUS LIMA PEREIRA", Cargo: "AUX", Ativo: true },
  { id: 1087, Nome: "RAIMUNDO ANTONIO ROCHA DE SOUZA", Cargo: "AUX", Ativo: true },
  { id: 1088, Nome: "ARCLEYDSON REIS MOREIRA", Cargo: "AUX", Ativo: true },
  { id: 1089, Nome: "LUCIO FILIPE MARQUES FERREIRA", Cargo: "AUX", Ativo: true },
  { id: 1090, Nome: "RICHARDSON QUEIROZ COELHO", Cargo: "AUX", Ativo: true },
  { id: 1091, Nome: "SIMONE FERREIRA DE FREITAS", Cargo: "AUX", Ativo: true },
  { id: 1092, Nome: "ANDERSON DE CASTRO GURGEL", Cargo: "AUX", Ativo: true },
  { id: 1093, Nome: "ALEXSANDRO RODRIGUES BRAGA", Cargo: "AUX", Ativo: true },
  { id: 1094, Nome: "RILK EMANUEL ROCHA DO CARMO", Cargo: "AUX", Ativo: true },
  { id: 1095, Nome: "WITILAS PINHEIRO MACHADO", Cargo: "AUX", Ativo: true },
  { id: 1096, Nome: "ALEX OLIVEIRA DE SOUZA", Cargo: "AUX", Ativo: true },
  { id: 1097, Nome: "PAULO SILVANO MENDONÇA MARINHO", Cargo: "AUX", Ativo: true },
  { id: 1098, Nome: "NEILSON DE OLIVEIRA JORDÃO", Cargo: "AUX", Ativo: true },
  { id: 1099, Nome: "CARLOS GAMA RODRIGUES", Cargo: "AUX", Ativo: true },
  { id: 1100, Nome: "ALONSO MACHADO PEREIRA", Cargo: "AUX", Ativo: true },
  { id: 1101, Nome: "RAYSSOM FELIPE BATISTA FRAZÃO DA SILVA", Cargo: "AUX", Ativo: true },
  { id: 1102, Nome: "FRANCINALDO SILVA MENDES", Cargo: "AUX", Ativo: true },
  { id: 1103, Nome: "MARCIO RIBEIRO DA SILVA", Cargo: "AUX", Ativo: true },
  { id: 1104, Nome: "FLORIANO DOS SANTOS BERNARDO", Cargo: "AUX", Ativo: true },
  { id: 1105, Nome: "AFRANIO SERGIO BATISTA FRAZÃO", Cargo: "AUX", Ativo: true },
  { id: 1106, Nome: "JUNIOR DOS SANTOS LIMA", Cargo: "AUX", Ativo: true },
  { id: 1107, Nome: "JULIO CEZAR NEVES DE MELO", Cargo: "AUX", Ativo: true },
  { id: 1108, Nome: "LUCIANO PEREIRA DOS REIS", Cargo: "AUX", Ativo: true },
  { id: 1109, Nome: "THIAGO OLIVEIRA DE SOUZA", Cargo: "AUX", Ativo: true },
  { id: 1110, Nome: "CLEITON ELIAS DE FREITAS SILVA", Cargo: "AUX", Ativo: true },
  { id: 1111, Nome: "ANTONIO FERNANDES DA SILVA", Cargo: "AUX", Ativo: true },
  { id: 1112, Nome: "GIVANILDO LEAO DE OLIVEIRA", Cargo: "AUX", Ativo: true },
  { id: 1113, Nome: "JOSE RENATO RAMOS DA SILVA", Cargo: "AUX", Ativo: true },
  { id: 1114, Nome: "EDVÃ SERRÃO ANDURAND", Cargo: "AUX", Ativo: true },
  { id: 1115, Nome: "ANTONIO ROCHA JUNIOR", Cargo: "AUX", Ativo: true },
];

const QUESTIONS: Question[] = [
  {
    id: 1,
    text: "Qual o tempo limite (SLA) para a apresentação da carga pela CIA após ser puxada no sistema?",
    options: ["5 Minutos", "10 Minutos", "15 Minutos", "20 Minutos"],
    correct: 1
  },
  {
    id: 2,
    text: "Qual o tempo máximo que a WFS tem para disponibilizar o manifesto?",
    options: ["1 Hora", "2 Horas", "3 Horas", "4 Horas"],
    correct: 1
  },
  {
    id: 3,
    text: "Após a finalização do manifesto (WFS), em quanto tempo o representante da CIA deve comparecer ao setor de expedição?",
    options: ["Imediatamente", "10 Minutos", "15 Minutos", "30 Minutos"],
    correct: 2
  },
  {
    id: 4,
    text: "Qual o nome do campo que é obrigatório registrar antes de realizar a 'Entrega' de um manifesto?",
    options: ["Identidade do Motorista", "REPRESENTANTE CIA", "Foto da Carga", "Conferência Cega"],
    correct: 1
  },
  {
    id: 5,
    text: "O que significa o status 'Manifesto Iniciado' no sistema?",
    options: ["Carga recebida no pátio", "Auxiliar iniciou o manifesto", "Manifesto impresso", "Carga entregue ao cliente"],
    correct: 1
  },
  {
    id: 6,
    text: "Em qual guia o Auxiliar Operacional deve acessar para iniciar o manifesto e atribuir a responsabilidade para ele?",
    options: ["Cadastro", "Puxe", "Fluxo", "Eficiência"],
    correct: 1
  },
  {
    id: 7,
    text: "Em qual guia o Auxiliar Sistema deve acessar para cadastrar o manifesto e atribuir a responsabilidade para ele?",
    options: ["Cadastro", "Puxe", "Fluxo", "Eficiência"],
    correct: 0
  },
  {
    id: 8,
    text: "Qual informação deve ser inserida no campo 'Manifesto Puxado' no momento do cadastro?",
    options: [
      "Data e Hora atual do registro no sistema",
      "Data e Hora da folha do manifesto puxado impresso",
      "Horário estimado de chegada no terminal",
      "Apenas o número do voo sem data"
    ],
    correct: 1
  },
  {
    id: 10,
    text: "Qual informação deve ser inserida no campo 'Manifesto Recebido'?",
    options: [
      "Horário de abertura do portão de carga",
      "Data e Hora atual que está realizando o cadastro",
      "Atribuir Data e Hora que o representante da CIA entregou o manifesto (Constado no carimbo da presença)",
      "Horário que a carga foi alocada no armazém"
    ],
    correct: 2
  },
  {
    id: 11,
    text: "No setor de entrega existem duas estações, qual é o fluxo correto para usar as duas estações?",
    options: [
      "Ambas as estações realizam as mesmas funções de Cadastro e Puxe de forma alternada",
      "A Estação 01 é para uso da CIA aérea e a Estação 02 para uso exclusivo da WFS",
      "Estação 01 (Guia 'Cadastro') é somente para o sistema, enquanto a Estação 02 é para operação (Guia 'Puxe')",
      "A Estação 01 é para conferência física de volumes e a Estação 02 para emissão de etiquetas"
    ],
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
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [answers, setAnswers] = useState<number[]>([]);
  const [quizFinished, setQuizFinished] = useState(false);
  const [userResult, setUserResult] = useState<any>(null);
  const [reportData, setReportData] = useState<any[]>([]);
  
  const searchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setSuggestions([]);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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

    // 1. Filtrar na lista local (estática)
    const localMatches = STATIC_EMPLOYEES.filter(e => 
      e.Nome.toLowerCase().includes(searchTerm.toLowerCase())
    );

    try {
      // 2. Buscar no Supabase
      const { data } = await supabase
        .from('Funcionarios_WFS')
        .select('*')
        .ilike('Nome', `%${searchTerm}%`)
        .eq('Ativo', true)
        .limit(10);
      
      const dbResults = data || [];
      
      // 3. Unificar resultados removendo duplicatas por Nome
      const unified = [...localMatches];
      dbResults.forEach(dbItem => {
        if (!unified.some(u => u.Nome.toLowerCase() === dbItem.Nome.toLowerCase())) {
          unified.push(dbItem);
        }
      });

      setSuggestions(unified.slice(0, 10));
    } catch (e) {
      console.error(e);
      setSuggestions(localMatches);
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
      const { data } = await supabase
        .from('SMO_Avaliacoes')
        .select('*')
        .eq('Nome_Funcionario', operator.Nome)
        .maybeSingle();
      
      if (data && data.Tentativa_3 !== null && data.Tentativa_3 !== undefined) {
        onShowAlert('error', 'Limite de 3 tentativas atingido para este operador.');
        setLoading(false);
        return;
      }
      
      setUserResult(data || { Nome_Funcionario: operator.Nome, Cargo: operator.Cargo || 'OPERADOR' });
      setQuizStarted(true);
      setAnswers([]);
      setCurrentQuestion(0);
      setSelectedOption(null);
      setQuizFinished(false);
    } catch (e) {
      setUserResult({ Nome_Funcionario: operator.Nome, Cargo: operator.Cargo || 'OPERADOR' });
      setQuizStarted(true);
      setAnswers([]);
      setCurrentQuestion(0);
      setSelectedOption(null);
      setQuizFinished(false);
    } finally {
      setLoading(false);
    }
  };

  const handleNext = () => {
    if (selectedOption === null) return;
    
    const newAnswers = [...answers, selectedOption];
    setAnswers(newAnswers);
    setSelectedOption(null);
    
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
    } else if (updateData.Tentativa_3 === undefined || updateData.Tentativa_3 === null) {
      updateData.Tentativa_3 = score;
      updateData.Data_Tentativa_3 = now;
    }

    const bestScore = Math.max(
      updateData.Tentativa_1 ?? 0, 
      updateData.Tentativa_2 ?? 0, 
      updateData.Tentativa_3 ?? 0
    );
    updateData.Status = bestScore >= 7 ? 'APROVADO' : 'REPROVADO';

    try {
      const { id, created_at, ...payload } = updateData;

      const { error } = await supabase
        .from('SMO_Avaliacoes')
        .upsert(payload, { onConflict: 'Nome_Funcionario' });

      if (error) throw error;
      onShowAlert('success', `Avaliação Finalizada! Pontuação: ${score}/10`);
    } catch (e: any) {
      console.error("Erro ao salvar resultado da prova:", e);
      onShowAlert('error', `Erro ao registrar progresso: ${e.message}`);
    }
  };

  return (
    <div className="flex flex-col gap-6 animate-fadeIn h-full">
      <div className="bg-[#0f172a] dark:bg-[#020617] border-2 border-slate-800 dark:border-slate-900 p-4 flex items-center justify-between shadow-lg shrink-0">
        <div className="flex items-center gap-4">
          <div className="p-2 bg-orange-600 rounded">
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

                <div className="grid grid-cols-1 gap-3 mb-10">
                   {QUESTIONS[currentQuestion].options.map((opt, idx) => (
                     <button 
                      key={idx} 
                      onClick={() => setSelectedOption(idx)}
                      className={`w-full p-5 text-left border-2 transition-all flex items-center justify-between group ${selectedOption === idx ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-900/20' : 'border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-900 hover:border-slate-300'}`}
                     >
                        <span className={`text-sm font-bold ${selectedOption === idx ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-700 dark:text-slate-300'}`}>{opt}</span>
                        <div className={`w-6 h-6 rounded-full border-2 transition-all flex items-center justify-center ${selectedOption === idx ? 'border-indigo-600 bg-indigo-600' : 'border-slate-200 dark:border-slate-700'}`}>
                           {selectedOption === idx && <div className="w-2 h-2 bg-white rounded-full"></div>}
                        </div>
                     </button>
                   ))}
                </div>

                <div className="flex justify-end pt-6 border-t border-slate-100 dark:border-slate-700">
                   <button 
                    disabled={selectedOption === null}
                    onClick={handleNext}
                    className={`h-14 px-10 flex items-center gap-3 text-[11px] font-black uppercase tracking-widest transition-all shadow-xl ${selectedOption !== null ? 'bg-indigo-600 text-white hover:bg-slate-900' : 'bg-slate-200 text-slate-400 cursor-not-allowed'}`}
                   >
                     {currentQuestion < QUESTIONS.length - 1 ? 'Confirmar e Avançar' : 'Finalizar Avaliação'}
                     <ChevronRight size={18} />
                   </button>
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
                   <p className="text-[11px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-1">Total de Candidatos</p>
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
                           .sort((a,b) => {
                             const bestA = Math.max(a.Tentativa_1 ?? 0, a.Tentativa_2 ?? 0, a.Tentativa_3 ?? 0);
                             const bestB = Math.max(b.Tentativa_1 ?? 0, b.Tentativa_2 ?? 0, b.Tentativa_3 ?? 0);
                             return bestB - bestA;
                           })
                           .map((r, idx) => {
                           const best = Math.max(r.Tentativa_1 ?? 0, r.Tentativa_2 ?? 0, r.Tentativa_3 ?? 0);
                           return (
                             <tr key={r.id || r.Nome_Funcionario} className="hover:bg-slate-50 dark:hover:bg-indigo-900/10 transition-colors group">
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
