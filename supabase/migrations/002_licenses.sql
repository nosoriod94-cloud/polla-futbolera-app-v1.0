-- ============================================================
-- Migración 002: Sistema de licencias + invite_code en pollas
-- ============================================================

-- ============================================================
-- 1. Agregar invite_code a la tabla pollas
-- Código corto y legible para que los participantes se unan
-- ej: "OSORIO26", "MUNDIAL-2026", etc.
-- ============================================================

alter table pollas add column if not exists invite_code text unique;

-- Función para generar un código de invitación corto (8 chars alfanuméricos)
create or replace function generate_invite_code()
returns text language plpgsql as $$
declare
  chars text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  result text := '';
  i int;
  code_exists boolean;
begin
  loop
    result := '';
    for i in 1..8 loop
      result := result || substr(chars, floor(random() * length(chars) + 1)::int, 1);
    end loop;
    -- Verificar que no existe ya ese código
    select exists(select 1 from pollas where invite_code = result) into code_exists;
    exit when not code_exists;
  end loop;
  return result;
end;
$$;

-- Trigger para auto-generar invite_code al crear una polla
create or replace function set_invite_code()
returns trigger language plpgsql as $$
begin
  if new.invite_code is null then
    new.invite_code := generate_invite_code();
  end if;
  return new;
end;
$$;

create trigger pollas_set_invite_code
  before insert on pollas
  for each row execute function set_invite_code();

-- ============================================================
-- 2. Tabla licenses
-- Claves de licencia que el super-admin genera y vende/entrega
-- ============================================================

create table licenses (
  id uuid primary key default uuid_generate_v4(),
  code text unique not null,
  polla_id uuid references pollas(id) on delete set null default null,
  used_by uuid references auth.users(id) on delete set null default null,
  used_at timestamptz default null,
  created_at timestamptz not null default now()
);

alter table licenses enable row level security;

-- Cualquier usuario autenticado puede verificar si una licencia existe y está disponible
-- (necesario para validar antes de crear la polla)
create policy "licenses: select authenticated" on licenses
  for select using (auth.role() = 'authenticated');

-- Solo el super-admin puede insertar licencias (validado via función security definer)
-- No se crea policy directa de INSERT — se usa función con security definer abajo.

-- ============================================================
-- 3. Función: redeem_license
-- Valida y usa una licencia al crear una polla.
-- Se ejecuta con security definer para bypassear RLS en el UPDATE.
-- ============================================================

create or replace function redeem_license(
  p_license_code text,
  p_polla_id uuid
)
returns void language plpgsql security definer as $$
declare
  v_license_id uuid;
begin
  -- Buscar licencia válida (no usada)
  select id into v_license_id
  from licenses
  where code = upper(p_license_code)
    and used_at is null
    and polla_id is null;

  if v_license_id is null then
    raise exception 'Clave de licencia inválida o ya fue utilizada.';
  end if;

  -- Marcar como usada
  update licenses
  set
    polla_id = p_polla_id,
    used_by  = auth.uid(),
    used_at  = now()
  where id = v_license_id;
end;
$$;

-- ============================================================
-- 4. Función: create_license (solo super-admin)
-- Genera una nueva clave de licencia con formato XXXX-XXXX-XXXX
-- ============================================================

create or replace function create_license(p_superadmin_id uuid)
returns text language plpgsql security definer as $$
declare
  chars text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  segment text;
  code text;
  i int;
  j int;
  code_exists boolean;
begin
  -- Solo el super-admin puede crear licencias
  if auth.uid() != p_superadmin_id then
    raise exception 'No autorizado.';
  end if;

  loop
    code := '';
    for j in 1..3 loop
      segment := '';
      for i in 1..4 loop
        segment := segment || substr(chars, floor(random() * length(chars) + 1)::int, 1);
      end loop;
      if j < 3 then
        code := code || segment || '-';
      else
        code := code || segment;
      end if;
    end loop;

    select exists(select 1 from licenses where licenses.code = code) into code_exists;
    exit when not code_exists;
  end loop;

  insert into licenses (code) values (code);
  return code;
end;
$$;

-- ============================================================
-- 5. Actualizar RLS de pollas: participantes se unen por invite_code
-- (reemplaza el flujo de UUID largo)
-- ============================================================

-- Actualizar la policy de INSERT en polla_participants para buscar por invite_code
-- (la lógica de búsqueda por invite_code se maneja en la app, no en RLS)

-- ============================================================
-- NOTA IMPORTANTE PARA EL SETUP:
-- Después de correr esta migración, debes:
-- 1. Obtener tu user_id de Supabase (Authentication → Users → tu email → copia el UUID)
-- 2. Agregarlo al .env como: VITE_SUPERADMIN_USER_ID=tu-uuid-aqui
-- ============================================================
