
import { createClient } from '@supabase/supabase-js';

// ------------------------------------------------------------------
// CONFIGURAÇÃO SUPABASE (NOVO PROJETO)
// ------------------------------------------------------------------

const SUPABASE_URL = 'https://teca-admin-supabase.ly7t0m.easypanel.host'; 
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyAgCiAgICAicm9sZSI6ICJhbm9uIiwKICAgICJpc3MiOiAic3VwYWJhc2UtZGVtbyIsCiAgICAiaWF0IjogMTY0MTc2OTIwMCwKICAgICJleHAiOiAxNzk5NTM1NjAwCn0.dc_X5iR_VP_qT0zsiyj_I_OZ2T9FtRU2BBNWN8Bu4GE';

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