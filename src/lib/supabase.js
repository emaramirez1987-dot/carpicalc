import { createClient } from '@supabase/supabase-js';

const url  = process.env.REACT_APP_SUPABASE_URL;
const key  = process.env.REACT_APP_SUPABASE_ANON_KEY;

if (!url || !key) {
  console.error('CarpiCalc: faltan variables REACT_APP_SUPABASE_URL / REACT_APP_SUPABASE_ANON_KEY en .env.local');
}

export const supabase = createClient(url, key, {
  auth: {
    persistSession:    true,
    autoRefreshToken:  true,
    detectSessionInUrl: true,
  },
});
