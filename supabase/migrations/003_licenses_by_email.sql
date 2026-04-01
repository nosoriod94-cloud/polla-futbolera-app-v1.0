-- ============================================================
-- Migración 003: Licencias por email — modelo multi-polla
-- ============================================================
-- Diseño: 1 licencia por email, permite crear hasta N pollas
-- (default 3). SuperAdmin puede suspender/reactivar cuentas.
-- Todos los cambios a la tabla van por funciones security definer.
-- ============================================================

-- Limpiar cualquier versión anterior
drop table if exists licenses cascade;
drop function if exists grant_license cascade;
drop function if exists use_license cascade;
drop function if exists get_all_licenses cascade;
drop function if exists toggle_license_active cascade;
drop function if exists create_license cascade;
drop function if exists redeem_license cascade;

-- Tabla de licencias
create table licenses (
  id               uuid        primary key default gen_random_uuid(),
  email_autorizado text        not null unique,   -- email del cliente (siempre lowercase)
  pollas_limit     int         not null default 3, -- cuántas pollas puede crear
  pollas_created   int         not null default 0, -- contador de pollas activas
  is_active        boolean     not null default true, -- SuperAdmin puede suspender
  otorgada_por     uuid        references auth.users,
  created_at       timestamptz default now()
);

-- RLS: cada cliente solo ve su propia licencia
alter table licenses enable row level security;

create policy "ver propia licencia"
  on licenses for select
  using (
    email_autorizado = lower((select email from auth.users where id = auth.uid()))
  );

-- Sin INSERT/UPDATE directo — solo vía funciones security definer

-- ─────────────────────────────────────────────
-- Función: SuperAdmin otorga licencia a un email
-- ─────────────────────────────────────────────
create or replace function grant_license(p_superadmin_id uuid, p_email text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Validar que quien llama es el superadmin
  if auth.uid() != p_superadmin_id then
    raise exception 'No autorizado';
  end if;
  if not exists (
    select 1 from auth.users
    where id = p_superadmin_id and email = 'hola@pollafutbolera.online'
  ) then
    raise exception 'No autorizado';
  end if;

  insert into licenses (email_autorizado, otorgada_por)
    values (lower(trim(p_email)), p_superadmin_id)
    on conflict (email_autorizado) do nothing;
end;
$$;

-- ─────────────────────────────────────────────
-- Función: SuperAdmin activa o suspende una cuenta
-- ─────────────────────────────────────────────
create or replace function toggle_license_active(
  p_superadmin_id uuid,
  p_email         text,
  p_active        boolean
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() != p_superadmin_id then
    raise exception 'No autorizado';
  end if;
  if not exists (
    select 1 from auth.users
    where id = p_superadmin_id and email = 'hola@pollafutbolera.online'
  ) then
    raise exception 'No autorizado';
  end if;

  update licenses
    set is_active = p_active
    where email_autorizado = lower(trim(p_email));

  if not found then
    raise exception 'Licencia no encontrada';
  end if;
end;
$$;

-- ─────────────────────────────────────────────
-- Función: Usar licencia al crear una polla
--   Valida licencia activa y que no superó el límite,
--   luego incrementa el contador.
-- ─────────────────────────────────────────────
create or replace function use_license(p_polla_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_license licenses;
  v_email   text;
begin
  select email into v_email
    from auth.users where id = auth.uid();

  select * into v_license
    from licenses
    where email_autorizado = lower(v_email)
    for update;

  if not found then
    raise exception 'No tienes una licencia asignada. Contacta hola@pollafutbolera.online';
  end if;

  if not v_license.is_active then
    raise exception 'Tu cuenta está suspendida. Contacta hola@pollafutbolera.online';
  end if;

  if v_license.pollas_created >= v_license.pollas_limit then
    raise exception 'Alcanzaste el límite de % pollas de tu licencia', v_license.pollas_limit;
  end if;

  update licenses
    set pollas_created = pollas_created + 1
    where email_autorizado = lower(v_email);
end;
$$;

-- ─────────────────────────────────────────────
-- Función: SuperAdmin obtiene todas las licencias
--   Evita SELECT directo a la tabla desde el cliente.
-- ─────────────────────────────────────────────
create or replace function get_all_licenses()
returns table (
  id               uuid,
  email_autorizado text,
  pollas_limit     int,
  pollas_created   int,
  is_active        boolean,
  otorgada_por     uuid,
  created_at       timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1 from auth.users
    where id = auth.uid() and email = 'hola@pollafutbolera.online'
  ) then
    raise exception 'No autorizado';
  end if;

  return query
    select
      l.id, l.email_autorizado, l.pollas_limit, l.pollas_created,
      l.is_active, l.otorgada_por, l.created_at
    from licenses l
    order by l.created_at desc;
end;
$$;
