# 🔐 03 - Variables de Entorno y Manejo de Credenciales

Este documento describe la gestión de credenciales en **Gestor Bar**, la distinción crítica de seguridad entre claves públicas y secretas, y cómo configurar el entorno de trabajo.

---

## 🔑 Tipos de Claves en Supabase

| Clave | Dónde se utiliza | ¿Es segura en el navegador? | Propósito |
|---|---|---|---|
| **`SUPABASE_URL`** | Frontend y Edge Functions | ✅ Sí (Pública) | Endpoint base de tu proyecto en Supabase (ej. `https://xyz.supabase.co`). |
| **`SUPABASE_ANON_KEY`** (o Publishable) | Frontend y Edge Functions | ✅ Sí (Pública) | Identifica las peticiones del cliente. El acceso a los datos está estrictamente controlado por las políticas **RLS** de Postgres. |
| **`SUPABASE_SERVICE_ROLE_KEY`** | **ÚNICAMENTE** en Edge Functions | ❌ **NUNCA EN EL FRONTEND** | Clave con privilegios de superusuario (`postgres`/`bypass RLS`). Si se filtra en el navegador, un usuario podría modificar cualquier dato de cualquier sucursal. |

---

## 📄 Archivo de Configuración (`.env.example`)

Copia la plantilla base en la raíz de tu proyecto:

```bash
cp .env.example .env
```

Contenido de `.env.example`:
```env
# ==========================================
# GESTOR BAR - CONFIGURACIÓN DE ENTORNO
# ==========================================

# URL de tu instancia de Supabase (Cloud o Local)
SUPABASE_URL=https://evkespjlgxdeofkafbjz.supabase.co

# Clave pública anónima de Supabase
SUPABASE_ANON_KEY=sb_publishable_WUsoToc9MSaja54-6Sksog_WAKHQidy

# ==========================================
# SOLO PARA EDGE FUNCTIONS / DESPLIEGUE CLI
# (Nunca exponer en archivos del frontend)
# ==========================================
# SUPABASE_SERVICE_ROLE_KEY=tu_service_role_key_aqui
```

---

## ⚙️ Desacoplamiento en Frontend (`js/core/config.js`)

Para evitar tener URLs y claves quemadas directamente en el código de conexión, el proyecto utiliza un módulo de configuración:

```javascript
// js/core/config.js
export const ENV_CONFIG = {
  SUPABASE_URL: window.__ENV?.SUPABASE_URL || 'https://evkespjlgxdeofkafbjz.supabase.co',
  SUPABASE_ANON_KEY: window.__ENV?.SUPABASE_ANON_KEY || 'sb_publishable_WUsoToc9MSaja54-6Sksog_WAKHQidy',
};
```

### Ventajas de este patrón:
1. Permite que en entornos de producción (como Docker, Netlify o Vercel) se puedan inyectar variables en tiempo de despliegue mediante un script `window.__ENV`.
2. Mantiene valores por defecto seguros para que el equipo pueda abrir el proyecto con **Live Server** sin necesidad de herramientas de compilación intermedias.
3. Prepara el código para que, cuando el proyecto migre a **Vite**, el cambio sea transparente sustituyendo `window.__ENV` por `import.meta.env`.

---

## 🚫 Reglas de Seguridad Obligatorias

1. **Nunca agregues `.env` al control de versiones.** Verifica que esté incluido en `.gitignore`.
2. **Si una `SERVICE_ROLE_KEY` se filtra accidentalmente en un commit**, debes revocarla y regenerarla inmediatamente desde el panel de control de Supabase (`Project Settings > API > JWT Secrets`).
3. Las llamadas a las Edge Functions desde el frontend utilizan la anon key:
   ```javascript
   const { data, error } = await supabase.functions.invoke('mi_funcion', { body: { ... } });
   ```
   Supabase inyecta internamente el token de sesión del usuario para que la Edge Function reconozca quién realiza la petición.
