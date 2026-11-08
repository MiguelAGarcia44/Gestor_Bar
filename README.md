# 🍻 Gestor Bar - SaaS POS & CRM para Bares y Restaurantes

Sistema integral de punto de venta (POS) y CRM operativo para la gestión ágil de mesas, comandas en tiempo real para barra y administración de catálogo y personal para bares y restaurantes.

---

## 🚀 Inicio Rápido en Local

### Prerrequisitos
- Navegador web moderno (Chrome, Firefox, Safari o Edge) con soporte de ES Modules.
- Extensión **Live Server** en VS Code o cualquier servidor estático local (ej. `npx serve .` o `python3 -m http.server 8080`).

### 1. Clonar el repositorio
```bash
git clone https://github.com/MiguelAGarcia44/Gestor_Bar.git
cd Gestor_Bar
```

### 2. Configurar variables de entorno
Copia la plantilla de variables:
```bash
cp .env.example .env
```
*(Consulta [onboarding/03-variables-entorno.md](onboarding/03-variables-entorno.md) para más detalles).*

### 3. Ejecutar
Abre el proyecto con VS Code y haz clic en **"Go Live"** en la barra inferior (o usa tu servidor local preferido).
Navega a: `http://127.0.0.1:5501/login.html`

---

## 👥 Roles del Sistema

| Rol | Vista Principal | Responsabilidad |
|---|---|---|
| `super_admin` | `panel_maestro.html` | Administración global SaaS: alta de sucursales, licenciamiento y credenciales maestras. |
| `admin` | `panel_local.html` | Dueño/Gerente de sucursal: catálogo de productos, precios y alta de personal operativo. |
| `mesero` | `terminal.html` | Punto de venta: plano de mesas, toma de pedidos, modificación de cantidades y cobro de cuentas. |
| `bartender` | `barra.html` | Kitchen Display System (KDS): monitor en tiempo real de órdenes pendientes (FIFO) y despacho de bebidas. |

---

## 🔄 Flujo de Pull Requests y Ramas

> [!IMPORTANT]
> **¿Vas a colaborar o mandar cambios?**
> Sigue estrictamente la guía: **[onboarding/workflow.md](onboarding/workflow.md)**.
> 1. Todo Pull Request debe apuntar a la rama **`dev`** (`feature/*` ➔ `dev`).
> 2. Se realizan las pruebas en `dev`.
> 3. Cuando los cambios están listos para ser visibles para clientes, se crea el PR de **`dev` a `main`**.

---

## 📚 Documentación y Onboarding

Para colaborar de forma ordenada, evitar conflictos en Git y comprender la arquitectura a fondo, consulta nuestra suite de documentación en el directorio [`onboarding/`](onboarding/):

1. **[Arquitectura del Sistema](onboarding/01-arquitectura.md)**: Capas de la aplicación, comunicación con Supabase y mapa de ruta.
2. **[Base de Datos y Multi-Sucursales](onboarding/02-base-de-datos.md)**: Diagrama ERD, modelo de aislamiento estricto por sucursal y reglas RLS.
3. **[Variables de Entorno y Seguridad](onboarding/03-variables-entorno.md)**: Configuración de claves públicas, secretas y buenas prácticas.
4. **[Despliegue y Ejecución](onboarding/04-despliegue-deploy.md)**: Guía detallada para desarrollo local y puesta en producción.
5. **[Flujo de Trabajo Git y Colaboración](onboarding/05-flujo-git-colaboracion.md)**: Convención de commits y prevención de conflictos.
6. **[Guía Oficial de PRs (Workflow)](onboarding/workflow.md)**: Pasos exactos para mandar PRs a `dev` y posteriormente a `main`.

---

## 🛠️ Stack Tecnológico
- **Frontend**: HTML5, CSS3, Vanilla JavaScript ES Modules (MPA estático).
- **Backend / BaaS**: [Supabase](https://supabase.com/) (PostgreSQL 17, Supabase Auth y Edge Functions en Deno/TypeScript).
- **Control de Versiones**: Git & GitHub.
