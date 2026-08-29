const SUPABASE_URL = 'https://vykackcwdbreeuziurpf.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_5RxYpZhzmasB0bzKFy2sOw_9gwer9kt';

const createClient = globalThis.supabase?.createClient;

export const supabaseClient = typeof createClient === 'function'
  ? createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true
      }
    })
  : null;

