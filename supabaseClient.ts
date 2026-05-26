
import { createClient } from '@supabase/supabase-js';

// ------------------------------------------------------------------
// CONFIGURAÇÃO SUPABASE (NOVO PROJETO)
// ------------------------------------------------------------------

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Define o schema do banco de dados como o padrão do Supabase
export const DB_SCHEMA = 'smo';

// Schema used for Performance Monitor tables and RPCs
export const PERFORMANCE_SCHEMA = 'smo';

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: {
    persistSession: true, // Mantém a sessão salva no navegador
    autoRefreshToken: true, // Tenta renovar o token automaticamente
    detectSessionInUrl: true
  },
  db: {
    schema: DB_SCHEMA // Define o schema padrão (public) para todas as consultas
  }
});