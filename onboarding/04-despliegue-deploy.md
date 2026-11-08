# 🚀 04 - Guía de Despliegue y Testing Local

Este documento explica cómo levantar el entorno completo de desarrollo local (Frontend + Supabase Local con Colima + Edge Functions + Base de Datos + Dashboard Studio) sin depender de permisos en la nube.

---

## 🛠️ 1. Stack de Testing Local Completo (Colima + Supabase CLI)

Para desarrollar y probar libremente sin romper la base de datos de producción ni depender de permisos de administración en Supabase Cloud, utilizamos **Colima + Supabase Local**:

### Prerrequisitos (Mac):
```bash
brew install colima docker docker-compose
```

### Paso a paso para arrancar el entorno:
```bash
# 1. Iniciar Colima (motor ligero de contenedores)
colima start --cpu 2 --memory 4

# 2. Iniciar la infraestructura de Supabase local
npx supabase start
```

### ¿Qué levanta `npx supabase start` automáticamente?
Al ejecutar este comando se inicializan 10 servicios en segundo plano:
- **Base de Datos PostgreSQL 17**: `127.0.0.1:54322`
- **API Gateway (Kong)**: `http://127.0.0.1:54321`
- **Edge Functions (Deno Runtime)**: `http://127.0.0.1:54321/functions/v1/<nombre>`
- **Supabase Studio (Dashboard Web Local)**: `http://127.0.0.1:54323`
- **Servidor de Emails de Prueba (Mailpit)**: `http://127.0.0.1:54324`

---

## 🗄️ 2. Base de Datos y Cuentas de Prueba Listas (Seed)

El proyecto incluye una migración inicial (`supabase/migrations/`) y un archivo de semillas (`supabase/seed.sql`). Para resetear la base de datos local y cargar datos de prueba:

```bash
npx supabase db reset
```

### 👤 Usuarios de Prueba Pre-creados (Contraseña para todos: `Test1234*`):

| Rol | Correo Electrónico | Contraseña | Vista asignada |
|---|---|---|---|
| **`admin`** (Dueño de Bar) | `admin@bar.com` | `Test1234*` | `views/crm/panel_local.html` |
| **`mesero`** | `mesero@bar.com` | `Test1234*` | `views/pos/terminal.html` |
| **`bartender`** | `bartender@bar.com` | `Test1234*` | `views/kds/barra.html` |
| **`super_admin`** (SaaS) | `superadmin@bar.com` | `Test1234*` | `views/saas/panel_maestro.html` |

*El seed también incluye el establecimiento de prueba **"Bar La Oveja Negra (Local Demo)"**, 4 mesas y 6 productos en el menú.*

---

## ⚡ 3. Edge Functions en Local

Cuando ejecutas `npx supabase start`, el contenedor de **Edge Functions ya está activo** y sirve automáticamente las funciones de `supabase/functions/`:
- `http://127.0.0.1:54321/functions/v1/registrar_empleado`
- `http://127.0.0.1:54321/functions/v1/registrar_cliente`
- `http://127.0.0.1:54321/functions/v1/editar_cliente`
- `http://127.0.0.1:54321/functions/v1/editar_empleado`
- `http://127.0.0.1:54321/functions/v1/cambiar_password`

> [!NOTE]
> **¿Por qué `npx supabase functions serve` parece "quedarse quieto"?**
> `functions serve` es un servidor web (daemon). Cuando muestra `Serving functions on http://127.0.0.1:54321/...`, no se ha congelado ni muerto; está escuchando peticiones HTTP en tiempo real y mostrando los logs de ejecución de cada función. Para detenerlo, presiona `Ctrl + C`.

---

## 🖥️ 4. Ejecución del Frontend en Local

1. Con Colima y Supabase corriendo, abre VS Code.
2. Haz clic en **"Go Live"** en la barra inferior (puerto `5501`).
3. El frontend (`js/core/config.js`) **detecta automáticamente** que estás en `127.0.0.1` o `localhost` y se conecta directamente a tu stack local de Supabase.
4. Navega a `http://127.0.0.1:5501/` e inicia sesión con cualquiera de las cuentas de prueba.

---

## 🛑 5. Apagar los Servicios para Ahorrar Batería

Cuando termines tu jornada de desarrollo:
```bash
# 1. Detiene los contenedores de Supabase
npx supabase stop

# 2. Apaga la máquina virtual de Colima
colima stop
```

---

## ☁️ 6. Preguntas Frecuentes y Despliegue en la Nube

### ¿Por qué falló `npx supabase link --project-ref ...`?
`supabase link` conecta la CLI de tu computadora con un proyecto específico en **Supabase Cloud**. Requiere que el creador del proyecto en la nube te añada como colaborador/administrador en el dashboard de Supabase.
**No necesitas `supabase link` para programar o probar localmente.** Tu entorno con Colima es 100% autónomo.

### ¿Cómo desplegar el Frontend a Producción?
El frontend puede desplegarse en cualquier servicio de hosting estático (Vercel, Netlify o GitHub Pages) apuntando al directorio raíz `./`. Al desplegarse en un dominio público, [config.js](../js/core/config.js) conmuta automáticamente a la base de datos de producción en Supabase Cloud.
