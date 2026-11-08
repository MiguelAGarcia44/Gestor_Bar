// config.js
// Centralización de credenciales y configuración del sistema
// Permite sobreescritura dinámica mediante window.__ENV o usa las credenciales por defecto

export const CONFIG = {
  SUPABASE_URL: (typeof window !== 'undefined' && window.__ENV?.SUPABASE_URL) 
    || 'https://evkespjlgxdeofkafbjz.supabase.co',
    
  SUPABASE_ANON_KEY: (typeof window !== 'undefined' && window.__ENV?.SUPABASE_ANON_KEY) 
    || 'sb_publishable_WUsoToc9MSaja54-6Sksog_WAKHQidy',
};
