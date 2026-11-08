# 🔄 Flujo de Trabajo y Pull Requests (Workflow Oficial)

Para evitar colisiones de código y garantizar que **ningún cambio inestable llegue a producción**, todo el equipo debe seguir este flujo sin excepción:

> [!IMPORTANT]
> **Regla de Oro de Git en Gestor Bar:**
> **TODO Pull Request debe apuntar primero a la rama `dev`.**
> Solo cuando los cambios en `dev` hayan sido probados y validados exhaustivamente, se creará un Pull Request de `dev` hacia `main` para hacerlos visibles en producción.

---

## 🗺️ Mapa Visual del Ciclo de Vida

```mermaid
flowchart TD
    subgraph Desarrollo [1. Desarrollo Local]
        DevPull["Actualizar dev local\n(git pull origin dev)"] --> Branch["Crear rama de feature\n(git checkout -b feature/nombre)"]
        Branch --> Coding["Programar y Probar en Local"]
        Coding --> Commit["Commit estándar\n(git commit -m 'feat: ...')"]
        Commit --> Push["Subir rama a GitHub\n(git push origin feature/nombre)"]
    end

    subgraph Integracion [2. Integración en DEV]
        Push --> PRDev["Crear Pull Request en GitHub\nBase: dev ⬅️ Compare: feature/nombre"]
        PRDev --> Review["Revisión de Código por el Equipo"]
        Review --> TestDev["Pruebas Funcionales en dev"]
        TestDev --> MergeDev["Merge a dev ✅"]
    end

    subgraph Produccion [3. Puesta en Producción (MAIN)]
        MergeDev --> ReleasePrep["Validación Final de Versión"]
        ReleasePrep --> PRMain["Crear Pull Request\nBase: main ⬅️ Compare: dev"]
        PRMain --> MergeMain["Merge a main 🚀\n(Cambios visibles al público)"]
    end
```

---

## 🚫 Políticas Estrictas de Ramas

| Rama | Propósito | ¿Permite push directo? | ¿Cómo recibe cambios? |
|---|---|---|---|
| **`main`** | **Producción** (visible para clientes y usuarios). | ❌ **PROHIBIDO** | **ÚNICAMENTE** mediante Pull Request desde `dev`. |
| **`dev`** | **Ambiente de Integración y Pruebas**. | ❌ **PROHIBIDO** | Mediante Pull Request desde ramas `feature/*` o `fix/*`. |
| **`feature/*`** | Nuevas funcionalidades para el bar o CRM. | ✅ Sí (tu rama personal) | Creada a partir de `dev`. |
| **`fix/*`** | Corrección de errores detectados. | ✅ Sí (tu rama personal) | Creada a partir de `dev`. |

---

## 💻 Guía Paso a Paso con Comandos de Terminal

### Paso 1: Actualizar tu rama `dev` local
Antes de empezar a programar cualquier cosa, asegúrate de tener la última versión:
```bash
git checkout dev
git pull origin dev
```

### Paso 2: Crear tu rama de trabajo
Usa un nombre descriptivo con prefijo `feature/` o `fix/`:
```bash
# Para una nueva pantalla o funcionalidad:
git checkout -b feature/reporte-ventas-diarias

# Para arreglar un error:
git checkout -b fix/error-total-mesa
```

### Paso 3: Realizar cambios y commits
Haz commits atómicos con mensajes descriptivos:
```bash
git add .
git commit -m "feat(crm): agregar calculo de ventas por dia en panel local"
```

### Paso 4: Subir tu rama a GitHub
```bash
git push origin feature/reporte-ventas-diarias
```

### Paso 5: Abrir el Pull Request hacia `dev` (¡OBLIGATORIO!)
1. Ve al repositorio en GitHub: [https://github.com/MiguelAGarcia44/Gestor_Bar](https://github.com/MiguelAGarcia44/Gestor_Bar).
2. Haz clic en **"Compare & pull request"**.
3. **Verifica las ramas:**
   - **`base: dev`** ⬅️ (Verifica que diga `dev`, **NO** `main`).
   - **`compare: feature/reporte-ventas-diarias`**.
4. Completa la plantilla de PR describiendo qué probaste.
5. Solicita la revisión a un compañero de equipo.

### Paso 6: Integración en `dev` y Pruebas
Una vez aprobado el PR por al menos un revisor:
- Se realiza el merge a `dev`.
- El equipo verifica que la funcionalidad opere correctamente y no rompa otras vistas (terminal, barra, login).

### Paso 7: Publicación a Producción (`dev` ➔ `main`)
Cuando se acuerde un corte de versión o liberación visible:
1. El encargado del proyecto crea un PR:
   - **`base: main`** ⬅️ **`compare: dev`**.
2. Se revisa el resumen de cambios acumulados.
3. Se hace el merge a `main`.
4. El cambio queda automáticamente visible en la URL de producción.

---

## 🛡️ Checklist Obligatorio antes de enviar un PR

Antes de marcar tu PR como listo para revisión, verifica:
- [ ] Mi rama se originó de `dev` actualizado.
- [ ] Mi PR tiene como base la rama **`dev`** (no `main`).
- [ ] **📱 Regla de Testing Responsivo Obligatoria:**
  - [ ] **Mobile View**: Probado en viewport móvil/táctil (375px a 430px en DevTools). El mesero/bartender debe poder operar botones cómodamente sin zoom.
  - [ ] **Full View**: Probado en pantalla de escritorio (1280px+). Los tableros de barra y tablas del CRM se leen sin descuadres.
- [ ] Probé el flujo de login con los roles afectados (`admin`, `mesero`, `bartender`).
- [ ] No dejé errores visibles en la consola de Developer Tools (`F12`).
- [ ] No modifiqué credenciales ni subí archivos `.env` o `.DS_Store`.
- [ ] Verifiqué que las consultas a Supabase no alteren datos de otras sucursales (`negocio_id`).
