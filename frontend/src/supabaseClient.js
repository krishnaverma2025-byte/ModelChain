import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

function optionalProfileClient() {
  if (!supabaseUrl || !supabaseAnonKey || supabaseAnonKey.startsWith('sb_secret_')) return null;
  try {
    const payload = supabaseAnonKey.split('.')[1];
    if (payload && JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/'))).role === 'service_role') return null;
    return createClient(supabaseUrl, supabaseAnonKey);
  } catch { return null; }
}

export const supabase = optionalProfileClient();
