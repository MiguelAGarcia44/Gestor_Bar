# 🚀 04 - Guía de Despliegue y Ejecución

Este documento explica cómo levantar el entorno de desarrollo local y cómo desplegar el frontend y las Edge Functions de **Gestor Bar** a producción.

---

## 💻 1. Ejecución en Entorno Local

Al tratarse de una arquitectura **MPA estática con ES Modules nativos**, no necesitas instalar paquetes de Node.js ni compilar para probar cambios en el frontend.

### Opción A: VS Code con Live Server (Recomendada para Frontend)
1. Instala la extensión **Live Server** de *Ritwick Dey* en VS Code.
2. Abre la raíz del proyecto `bar_manager`.
3. Haz clic en el botón **"Go Live"** en la esquina inferior derecha de VS Code (puerto por defecto `5501` o `5500`).
4. Abre tu navegador en:
   ```text
   http://127.0.0.1:5501/
   # o directamente:
   http://127.0.0.1:5501/views/auth/login.html
   ```

### Opción B: Servidor HTTP con Node o Python
Si prefieres usar la terminal:
```bash
# Con npx (Node.js)
npx serve . -p 5501

# O con Python 3
python3 -m http.server 5501
```

> [!IMPORTANT]
> **No abras los archivos HTML con doble clic directo (`file:///`)**, ya que los módulos JavaScript (`import { createClient } from ...`) son bloqueados por las políticas de seguridad CORS del navegador. Siempre debe ejecutarse sobre un servidor HTTP local (`http://127.0.0.1:...` o `http://localhost:...`).

---

## ⚡ 2. Trabajo con Edge Functions de Supabase

Las funciones de backend se encuentran en `supabase/functions/` y corren sobre el runtime de **Deno**.

### Prerrequisitos:
- Docker instalado y corriendo (si deseas emular Supabase en local).
- Supabase CLI:
  ```bash
  npm install -g supabase
  ```

### Probar Edge Functions en local:
```bash
# Iniciar la infraestructura de Supabase local (Postgres, Auth, Edge Functions)
npx supabase start

# Servir una función específica en local
npx supabase functions serve registrar_empleado --no-verify-jwt
```

### Desplegar Edge Functions a la nube de Supabase:
```bash
# 1. Iniciar sesión en Supabase CLI
npx supabase login

# 2. Vincular el proyecto con el Project Ref
npx supabase link --project-ref evkespjlgxdeofkafbjz

# 3. Desplegar una o todas las funciones
npx supabase functions deploy registrar_empleado
npx supabase functions deploy registrar_cliente
npx supabase functions deploy editar_cliente
npx supabase functions deploy editar_empleado
npx supabase functions deploy cambiar_password
```

---

## 🌐 3. Despliegue del Frontend a Producción

El frontend puede desplegarse en cualquier servicio de hosting de archivos estáticos:

### A. Vercel (Recomendado)
1. Conecta el repositorio de GitHub en el dashboard de Vercel.
2. En **Framework Preset**, selecciona **Other** (o Static).
3. En **Root Directory**, deja `./`.
4. En **Build Command**, déjalo vacío.
5. Haz clic en **Deploy**. Cada push a la rama `main` desplegará automáticamente.

### B. Cloudflare Pages / Netlify
1. Conecta el repositorio de GitHub.
2. Directorio de publicación: `/` (la raíz del proyecto).
3. Comando de build: Ninguno (vacío).
4. Guardar y desplegar.

### C. GitHub Pages
1. Ve a **Settings > Pages** en el repositorio de GitHub.
2. En **Source**, selecciona `Deploy from a branch`.
3. Selecciona la rama `main` y la carpeta `/ (root)`.
4. Guarda los cambios. Tu sitio estará en `https://miguelagarcia44.github.io/Gestor_Bar/views/auth/login.html`.

---

## 🛡️ 4. Lista de Verificación Pre-Despliegue (Checklist)

- [ ] Todas las rutas a scripts (`<script type="module" src="...">`) y hojas de estilo usan rutas relativas válidas.
- [ ] No existen referencias a archivos inexistentes (como el antiguo `app.js`).
- [ ] Los dominios de producción están dados de alta en la configuración CORS de Supabase (`Authentication > URL Configuration > Redirect URLs`).
- [ ] Las políticas RLS de PostgreSQL están activas y probadas para que ninguna sucursal vea datos ajenos.
