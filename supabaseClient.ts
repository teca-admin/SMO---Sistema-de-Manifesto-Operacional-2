
import { createClient } from '@supabase/supabase-js';

// ------------------------------------------------------------------
// CONFIGURAÇÃO SUPABASE
// ------------------------------------------------------------------

const SUPABASE_URL = 'https://teca-admin-supabase.ly7t0m.easypanel.host'; 
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyAgCiAgICAicm9sZSI6ICJhbm9uIiwKICAgICJpc3MiOiAic3VwYWJhc2UtZGVtbyIsCiAgICAiaWF0IjogMTY0MTc2OTIwMCwKICAgICJleHAiOiAxNzk5NTM1NjAwCn0.dc_X5iR_VP_qT0zsiyj_I_OZ2T9FtRU2BBNWN8Bu4GE';

export const DB_SCHEMA = 'smo';
export const PERFORMANCE_SCHEMA = 'smo';

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  },
  db: {
    schema: DB_SCHEMA
  },
  // Desabilita o cliente Realtime completamente para evitar loop de WebSocket
  // O sistema usa polling (setInterval a cada 5s) para atualizações
  realtime: {
    params: {
      eventsPerSecond: 0
    }
  }
});
