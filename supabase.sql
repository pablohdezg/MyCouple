-- ============================================================
--  Nuestro rincón — sincronización opcional entre los dos móviles
-- ============================================================
--
--  Sólo hace falta si queréis que los dos veáis lo mismo.
--  Sin esto, la app funciona perfectamente pero cada móvil
--  guarda sus propios datos.
--
--  Pasos:
--    1. Crear una cuenta gratuita en https://supabase.com
--    2. Nuevo proyecto → esperar a que termine de crearse
--    3. Menú lateral → "SQL Editor" → pegar esto → Run
--    4. "Project Settings" → "API" → copiar:
--         - Project URL       (https://xxxx.supabase.co, SIN /rest/v1 al final:
--                               la app ya le añade esa parte ella sola)
--         - Publishable key    (llamada "anon public" en paneles antiguos; empieza por sb_publishable_... o eyJ...)
--    5. En la app: Ajustes → Sincronización → pegar los dos valores
--       y escribir EL MISMO código de pareja en los dos móviles.
--
--  El "código de pareja" es vuestra contraseña. Cualquiera que lo
--  supiera y tuviera la clave anon podría leer la fila, así que usad
--  algo largo, por ejemplo:  ana-leo-2019-gatoluna-77
-- ============================================================

create table if not exists pares (
  code       text primary key,
  data       jsonb not null,
  updated_at timestamptz default now()
);

alter table pares enable row level security;

-- Acceso mediante la clave anon: la fila se protege por lo secreto del código.
drop policy if exists "acceso con codigo" on pares;
create policy "acceso con codigo"
  on pares for all
  using (true)
  with check (true);

-- IMPORTANTE: las políticas de RLS no bastan por sí solas. Postgres exige
-- además el permiso básico de tabla para el rol "anon" (el que usa la clave
-- pública); sin esto da "permission denied for table pares" aunque la
-- política de arriba esté bien. Al crear la tabla desde el SQL Editor (en
-- vez de con el editor visual) hay que concederlo a mano:
grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on public.pares to anon;
grant select, insert, update, delete on public.pares to authenticated;

-- Fuerza a la API a enterarse de la tabla/permisos nuevos sin esperar.
NOTIFY pgrst, 'reload schema';

-- ============================================================
--  Almacén para fotos, vídeos, notas de voz y dibujos
-- ============================================================
--  Sin esto, esas cosas se quedan sólo en el móvil que las creó: el otro
--  nunca las recibe, aunque el mensaje o el recuerdo sí le llegue.
--
--  Cada archivo se guarda con vuestro código de pareja delante de la ruta
--  (algo así como  ana-leo-2019/xy8f2k...), así que sólo quien conozca el
--  código puede llegar a ellos. Es la misma idea que protege la tabla
--  "pares" de arriba: el secreto no es la clave pública, es el código.

insert into storage.buckets (id, name, public)
values ('media', 'media', false)
on conflict (id) do nothing;

drop policy if exists "acceso con codigo media" on storage.objects;
create policy "acceso con codigo media"
  on storage.objects for all
  using (bucket_id = 'media')
  with check (bucket_id = 'media');

grant select, insert, update, delete on storage.objects to anon, authenticated;
grant select on storage.buckets to anon, authenticated;

-- ============================================================
--  Ubicación en vivo (tabla aparte, muy ligera)
-- ============================================================
--  ¿Por qué no reutilizar la tabla "pares"? Porque ahí vive TODO el estado
--  de la app (mensajes, recuerdos, listas...) en un único JSON. El servicio
--  de Android que sigue enviando la posición con la app cerrada tendría que
--  descargar y volver a subir ese bloque entero cada pocos minutos: mucho
--  gasto de datos y riesgo de pisar cambios del otro móvil.
--
--  Con esta tabla, cada aviso de posición son cuatro números. El servicio
--  puede escribirla solo, sin abrir la app, y el otro móvil la lee igual.

create table if not exists public.ubicaciones (
  code text not null,
  who text not null,
  lat double precision not null,
  lon double precision not null,
  accuracy real,
  battery int,
  at timestamptz not null default now(),
  primary key (code, who)
);

alter table public.ubicaciones enable row level security;

drop policy if exists "acceso con codigo ubicaciones" on public.ubicaciones;
create policy "acceso con codigo ubicaciones"
  on public.ubicaciones for all
  using (true)
  with check (true);

grant select, insert, update, delete on public.ubicaciones to anon, authenticated;

NOTIFY pgrst, 'reload schema';

-- Opcional: limpiar filas que lleven más de dos años sin tocarse.
-- delete from pares where updated_at < now() - interval '2 years';
