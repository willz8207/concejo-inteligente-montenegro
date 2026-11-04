-- =============================================================
-- Concejo Inteligente Montenegro · Esquema de base de datos
-- Pegar completo en Supabase → SQL Editor → Run (una sola vez).
-- =============================================================

-- 1. Tabla única de documentos (sesiones, proyectos, compromisos y configuración)
create table if not exists public.documentos (
  coleccion  text not null check (coleccion in ('sesiones','proyectos','compromisos','citaciones','gaceta','config')),
  id         text not null,
  data       jsonb not null,
  updated_at timestamptz not null default now(),
  primary key (coleccion, id)
);

-- 2. Correos autorizados para registrar información (Secretaría y quien ella designe)
create table if not exists public.editores (
  email text primary key
);

alter table public.documentos drop constraint if exists documentos_coleccion_check;
alter table public.documentos add constraint documentos_coleccion_check check (coleccion in ('sesiones','proyectos','compromisos','citaciones','gaceta','config'));
alter table public.documentos enable row level security;
alter table public.editores   enable row level security;  -- sin políticas: nadie la lee desde la web

-- 3. ¿El usuario que inició sesión es editor?
create or replace function public.es_editor()
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.editores
    where lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );
$$;
grant execute on function public.es_editor() to anon, authenticated;

-- 4. Reglas: todos leen (información pública), solo los editores escriben
drop policy if exists "lectura publica"     on public.documentos;
drop policy if exists "editores insertan"   on public.documentos;
drop policy if exists "editores actualizan" on public.documentos;
drop policy if exists "editores borran"     on public.documentos;

create policy "lectura publica"     on public.documentos for select using (true);
create policy "editores insertan"   on public.documentos for insert to authenticated with check (public.es_editor());
create policy "editores actualizan" on public.documentos for update to authenticated using (public.es_editor()) with check (public.es_editor());
create policy "editores borran"     on public.documentos for delete to authenticated using (public.es_editor());

-- 5. Participación ciudadana: cualquiera envía, solo los editores leen y archivan
create table if not exists public.participacion (
  id         uuid primary key default gen_random_uuid(),
  tipo       text not null check (tipo in ('inscripciones','buzon')),
  data       jsonb not null check (length(data::text) < 4000),
  created_at timestamptz not null default now()
);
alter table public.participacion enable row level security;
drop policy if exists "cualquiera envia"   on public.participacion;
drop policy if exists "editores leen"      on public.participacion;
drop policy if exists "editores archivan"  on public.participacion;
create policy "cualquiera envia"  on public.participacion for insert to anon, authenticated with check (true);
create policy "editores leen"     on public.participacion for select to authenticated using (public.es_editor());
create policy "editores archivan" on public.participacion for delete to authenticated using (public.es_editor());

-- 6. Actualización en vivo entre pantallas
do $$ begin
  alter publication supabase_realtime add table public.documentos;
exception when duplicate_object then null; end $$;
do $$ begin
  alter publication supabase_realtime add table public.participacion;
exception when duplicate_object then null; end $$;

-- 8. Gaceta Oficial digital: lo publicado no se modifica ni se borra (los errores se corrigen con fe de erratas)
create or replace function public.gaceta_inmutable()
returns trigger language plpgsql as $$
begin
  if old.coleccion = 'gaceta' and coalesce(old.data->>'demo','false') <> 'true' then
    raise exception 'Las publicaciones de la Gaceta no se pueden modificar ni borrar. Use una fe de erratas.';
  end if;
  if tg_op = 'DELETE' then return old; end if;
  return new;
end $$;
drop trigger if exists gaceta_inmutable on public.documentos;
create trigger gaceta_inmutable before update or delete on public.documentos
  for each row execute function public.gaceta_inmutable();

-- 9. PDF firmados de la Gaceta: lectura pública; solo los editores suben; nadie reemplaza ni borra
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('gaceta', 'gaceta', true, 10485760, array['application/pdf'])
on conflict (id) do nothing;
drop policy if exists "gaceta editores suben" on storage.objects;
create policy "gaceta editores suben" on storage.objects for insert to authenticated
  with check (bucket_id = 'gaceta' and public.es_editor());

-- 7. Autoriza el correo de la Secretaría (cámbialo por el real y ejecuta esta línea)
-- insert into public.editores (email) values ('secretaria@ejemplo.gov.co');
