// config.js
// Centralización de credenciales y configuración del sistema
// Detecta automáticamente si estás desarrollando en local o en producción

const esEntornoLocal = typeof window !== 'undefined' && (
  window.location.hostname === '127.0.0.1' || 
  window.location.hostname === 'localhost'
);

// 1. Configuración de Supabase Local (Colima / Docker)
const LOCAL_CONFIG = {
  SUPABASE_URL: 'http://127.0.0.1:54321',
  SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0',
};

// 2. Configuración de Supabase Cloud (Producción / Staging)
const CLOUD_CONFIG = {
  SUPABASE_URL: 'https://evkespjlgxdeofkafbjz.supabase.co',
  SUPABASE_ANON_KEY: 'sb_publishable_WUsoToc9MSaja54-6Sksog_WAKHQidy',
};

// Si estás en 127.0.0.1 o localhost usa el stack local (puedes forzar cloud con localStorage.setItem('FORZAR_CLOUD', 'true'))
const usarLocal = esEntornoLocal && (typeof window !== 'undefined' && window.localStorage.getItem('FORZAR_CLOUD') !== 'true');

const seleccion = usarLocal ? LOCAL_CONFIG : CLOUD_CONFIG;

export const CONFIG = {
  SUPABASE_URL: (typeof window !== 'undefined' && window.__ENV?.SUPABASE_URL) || seleccion.SUPABASE_URL,
  SUPABASE_ANON_KEY: (typeof window !== 'undefined' && window.__ENV?.SUPABASE_ANON_KEY) || seleccion.SUPABASE_ANON_KEY,
  ES_LOCAL: usarLocal,
};
