# 🧭 Índice de Onboarding - Gestor Bar

¡Bienvenido al equipo de desarrollo de **Gestor Bar**!

Esta documentación está diseñada para que cualquier desarrollador pueda integrarse rápidamente, entender la arquitectura del software, configurar su entorno de trabajo en minutos y colaborar con el equipo sin generar fricciones ni conflictos en Git.

> [!IMPORTANT]
> **Antes de enviar tu primer Pull Request:**
> Lee obligatoriamente el **[Flujo de Trabajo y Pull Requests (workflow.md)](workflow.md)**.
> **Regla de oro:** Todo PR debe mandarse primero a la rama `dev`. Una vez probado y validado en `dev`, se manda a `main` para hacerlo visible en producción.

---

## 🎯 Objetivo del Sistema

Gestor Bar es un software SaaS para bares y restaurantes orientado a resolver tres problemas principales:
1. **Velocidad de operación en piso**: Los meseros pueden abrir mesas, anotar comandas y cobrar cuentas con rapidez desde dispositivos móviles o terminales táctiles.
2. **Sincronización en barra/cocina**: Los bartenders ven los pedidos al instante en una pantalla organizada por orden de llegada (FIFO), reduciendo tiempos de espera y extravíos de órdenes.
3. **Aislamiento estricto por sucursal**: Cada bar o sucursal opera como un ente independiente con su propio menú, mesas, empleados y cuentas sin mezclar información.

---

## 📖 Ruta de Lectura Recomendada

Te recomendamos leer los documentos en el siguiente orden:

| Orden | Documento | Contenido Principal |
|---|---|---|
| 1 | **[01-arquitectura.md](01-arquitectura.md)** | Visión general del stack, capas del frontend, guardianes de ruta y evolución técnica. |
| 2 | **[02-base-de-datos.md](02-base-de-datos.md)** | Diagrama relacional, entidades, claves foráneas y modelo de aislamiento con RLS en PostgreSQL. |
| 3 | **[03-variables-entorno.md](03-variables-entorno.md)** | Configuración de credenciales de Supabase y manejo de claves públicas vs secretas. |
| 4 | **[04-despliegue-deploy.md](04-despliegue-deploy.md)** | Pasos para correr el proyecto localmente y opciones de hosting en producción. |
| 5 | **[05-flujo-git-colaboracion.md](05-flujo-git-colaboracion.md)** | Convenciones de commits, colaboración en equipo y prevención de conflictos. |
| 🌟 | **[workflow.md (Guía de PRs)](workflow.md)** | **Paso a paso exacto para abrir PRs: `feature` ➔ `dev` ➔ `main`.** |

---

## ⚠️ Reglas de Oro del Proyecto

- **NUNCA hagas push directo a `main` ni a `dev`.** Todo cambio debe entrar vía Pull Request hacia `dev`.
- **📱 Regla de Testing Responsivo:** Todo cambio de interfaz debe probarse obligatoriamente tanto en **Mobile** (pantalla táctil / celular) como en **Full View** (pantalla completa de escritorio).
- **Nunca subas claves secretas (Service Role Key) al frontend.** Solo la clave anónima (`anon` / `publishable`) está permitida en código del cliente.
- **Toda consulta a la base de datos debe respetar el `negocio_id`.** La seguridad se refuerza en PostgreSQL mediante RLS, pero el frontend siempre debe enviar el contexto del usuario autenticado.
- **Verifica que los estilos y recursos utilicen rutas correctas** (evita enlaces rotos a `style.css` o scripts que no existan).
