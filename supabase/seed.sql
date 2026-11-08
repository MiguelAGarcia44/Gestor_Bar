-- Datos de Prueba para Testing Local (Seed)

-- 1. Crear un negocio de prueba
INSERT INTO public.negocios (id, nombre_comercial, estatus_suscripcion)
VALUES ('a0000000-0000-0000-0000-000000000001', 'Bar La Oveja Negra (Local Demo)', true)
ON CONFLICT (id) DO NOTHING;

-- 2. Crear mesas de prueba
INSERT INTO public.mesas (id, negocio_id, etiqueta, activa)
VALUES 
    ('b0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'Mesa 1', true),
    ('b0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', 'Mesa 2', true),
    ('b0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000001', 'Mesa 3', true),
    ('b0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000001', 'Barra Principal', true)
ON CONFLICT (id) DO NOTHING;

-- 3. Crear productos de prueba
INSERT INTO public.productos (id, negocio_id, nombre, precio_actual, disponible)
VALUES 
    ('c0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'Cerveza Corona 355ml', 45.00, true),
    ('c0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', 'Cerveza Victoria 355ml', 45.00, true),
    ('c0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000001', 'Mojito Clásico', 85.00, true),
    ('c0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000001', 'Tequila Don Julio 70 (Shot)', 120.00, true),
    ('c0000000-0000-0000-0000-000000000005', 'a0000000-0000-0000-0000-000000000001', 'Nachos con Queso', 75.00, true),
    ('c0000000-0000-0000-0000-000000000006', 'a0000000-0000-0000-0000-000000000001', 'Alitas BBQ (10 pzas)', 130.00, true)
ON CONFLICT (id) DO NOTHING;

-- 4. Crear usuarios de prueba en Auth con contraseñas seguras
-- Contraseña para todos: "Test1234*"
INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password, 
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
    confirmation_token, recovery_token, email_change_token_new, email_change,
    created_at, updated_at
)
VALUES 
    ('00000000-0000-0000-0000-000000000000', 'd0000000-0000-0000-0000-000000000001', 'authenticated', 'authenticated', 'superadmin@bar.com', crypt('Test1234*', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{}', '', '', '', '', now(), now()),
    ('00000000-0000-0000-0000-000000000000', 'd0000000-0000-0000-0000-000000000002', 'authenticated', 'authenticated', 'admin@bar.com', crypt('Test1234*', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{}', '', '', '', '', now(), now()),
    ('00000000-0000-0000-0000-000000000000', 'd0000000-0000-0000-0000-000000000003', 'authenticated', 'authenticated', 'mesero@bar.com', crypt('Test1234*', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{}', '', '', '', '', now(), now()),
    ('00000000-0000-0000-0000-000000000000', 'd0000000-0000-0000-0000-000000000004', 'authenticated', 'authenticated', 'bartender@bar.com', crypt('Test1234*', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{}', '', '', '', '', now(), now())
ON CONFLICT (id) DO NOTHING;

-- 5. Crear identidades en Auth
INSERT INTO auth.identities (id, user_id, identity_data, provider, provider_id, created_at, updated_at)
VALUES
    ('d0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000001', '{"sub":"d0000000-0000-0000-0000-000000000001","email":"superadmin@bar.com"}', 'email', 'superadmin@bar.com', now(), now()),
    ('d0000000-0000-0000-0000-000000000002', 'd0000000-0000-0000-0000-000000000002', '{"sub":"d0000000-0000-0000-0000-000000000002","email":"admin@bar.com"}', 'email', 'admin@bar.com', now(), now()),
    ('d0000000-0000-0000-0000-000000000003', 'd0000000-0000-0000-0000-000000000003', '{"sub":"d0000000-0000-0000-0000-000000000003","email":"mesero@bar.com"}', 'email', 'mesero@bar.com', now(), now()),
    ('d0000000-0000-0000-0000-000000000004', 'd0000000-0000-0000-0000-000000000004', '{"sub":"d0000000-0000-0000-0000-000000000004","email":"bartender@bar.com"}', 'email', 'bartender@bar.com', now(), now())
ON CONFLICT (id) DO NOTHING;

-- 6. Vincular los perfiles públicos en public.usuarios
INSERT INTO public.usuarios (id, negocio_id, nombre_completo, rol, activo)
VALUES
    ('d0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'Super Administrador SaaS', 'super_admin', true),
    ('d0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', 'Gerente Dueño', 'admin', true),
    ('d0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000001', 'Carlos Mesero', 'mesero', true),
    ('d0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000001', 'Mateo Bartender', 'bartender', true)
ON CONFLICT (id) DO NOTHING;
