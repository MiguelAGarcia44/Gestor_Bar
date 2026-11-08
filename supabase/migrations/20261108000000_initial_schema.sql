-- Migración Inicial: Esquema de Base de Datos para Gestor Bar
-- Generado para pruebas locales y despliegue estandarizado

-- 1. TABLA NEGOCIOS (Inquilinos / Sucursales)
CREATE TABLE IF NOT EXISTS public.negocios (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre_comercial TEXT NOT NULL,
    estatus_suscripcion BOOLEAN DEFAULT true,
    fecha_registro TIMESTAMPTZ DEFAULT now()
);

-- 2. TABLA USUARIOS (Perfiles asociados a auth.users)
CREATE TABLE IF NOT EXISTS public.usuarios (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    negocio_id UUID REFERENCES public.negocios(id) ON DELETE CASCADE,
    nombre_completo TEXT NOT NULL,
    rol TEXT NOT NULL CHECK (rol IN ('super_admin', 'admin', 'mesero', 'bartender')),
    activo BOOLEAN DEFAULT true
);

-- 3. TABLA PRODUCTOS (Catálogo de Menú)
CREATE TABLE IF NOT EXISTS public.productos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    negocio_id UUID REFERENCES public.negocios(id) ON DELETE CASCADE,
    nombre TEXT NOT NULL,
    precio_actual NUMERIC(10, 2) NOT NULL,
    disponible BOOLEAN DEFAULT true
);

-- 4. TABLA MESAS (Distribución de Piso)
CREATE TABLE IF NOT EXISTS public.mesas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    negocio_id UUID REFERENCES public.negocios(id) ON DELETE CASCADE,
    etiqueta TEXT NOT NULL,
    activa BOOLEAN DEFAULT true
);

-- 5. TABLA CUENTAS (Cuentas activas o cerradas por mesa)
CREATE TABLE IF NOT EXISTS public.cuentas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    negocio_id UUID REFERENCES public.negocios(id) ON DELETE CASCADE,
    mesa_id UUID REFERENCES public.mesas(id) ON DELETE CASCADE,
    mesero_id UUID REFERENCES public.usuarios(id) ON DELETE SET NULL,
    estado TEXT NOT NULL CHECK (estado IN ('abierta', 'cerrada')),
    total NUMERIC(10, 2) DEFAULT 0,
    fecha_apertura TIMESTAMPTZ DEFAULT now(),
    fecha_cierre TIMESTAMPTZ
);

-- 6. TABLA COMANDAS (Líneas de pedido / Tickets de barra)
CREATE TABLE IF NOT EXISTS public.comandas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    negocio_id UUID REFERENCES public.negocios(id) ON DELETE CASCADE,
    cuenta_id UUID REFERENCES public.cuentas(id) ON DELETE CASCADE,
    producto_id UUID REFERENCES public.productos(id) ON DELETE CASCADE,
    cantidad INTEGER NOT NULL DEFAULT 1,
    precio_unitario NUMERIC(10, 2) NOT NULL,
    estado_preparacion TEXT NOT NULL CHECK (estado_preparacion IN ('pendiente', 'entregado')),
    fecha_solicitud TIMESTAMPTZ DEFAULT now()
);

-- ==========================================
-- POLÍTICAS DE ACCESO (ROW LEVEL SECURITY)
-- ==========================================

ALTER TABLE public.negocios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.productos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mesas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cuentas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comandas ENABLE ROW LEVEL SECURITY;

-- Políticas permisivas para desarrollo local (autenticados pueden operar en su negocio)
CREATE POLICY "Acceso autenticado a negocios" ON public.negocios FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Acceso autenticado a usuarios" ON public.usuarios FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Acceso autenticado a productos" ON public.productos FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Acceso autenticado a mesas" ON public.mesas FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Acceso autenticado a cuentas" ON public.cuentas FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Acceso autenticado a comandas" ON public.comandas FOR ALL TO authenticated USING (true) WITH CHECK (true);
