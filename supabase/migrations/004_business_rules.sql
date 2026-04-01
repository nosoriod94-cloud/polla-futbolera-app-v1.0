-- ============================================================
-- Migración 004: Reglas de negocio y fixes de seguridad
-- ============================================================
-- 1. Tabla participant_limit_requests (solicitudes de expansión)
-- 2. Trigger: límite de 50 participantes por polla
-- 3. Fix seguridad: recrear standings_view sin user_id
-- ============================================================

-- ─────────────────────────────────────────────
-- 1. Solicitudes de expansión de participantes
-- ─────────────────────────────────────────────
create table if not exists participant_limit_requests (
  id              uuid        primary key default gen_random_uuid(),
  polla_id        uuid        not null references pollas(id) on delete cascade,
  admin_id        uuid        not null references auth.users(id),
  current_limit   int         not null default 50,
  requested_limit int         not null,
  status          text        not null default 'pending'
                              check (status in ('pending', 'approved', 'rejected')),
  notes           text,
  resolved_at     timestamptz,
  created_at      timestamptz default now()
);

alter table participant_limit_requests enable row level security;

-- Admin solo ve sus propias solicitudes
create policy "ver propias solicitudes de limite"
  on participant_limit_requests for select
  using (admin_id = auth.uid());

create policy "crear solicitud de limite"
  on participant_limit_requests for insert
  with check (admin_id = auth.uid());

-- Función: SuperAdmin resuelve una solicitud (aprueba o rechaza)
create or replace function resolve_limit_request(
  p_superadmin_id uuid,
  p_request_id    uuid,
  p_status        text,   -- 'approved' | 'rejected'
  p_notes         text default null
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
  if p_status not in ('approved', 'rejected') then
    raise exception 'Estado inválido';
  end if;

  update participant_limit_requests
    set status      = p_status,
        notes       = p_notes,
        resolved_at = now()
    where id = p_request_id;

  if not found then
    raise exception 'Solicitud no encontrada';
  end if;
end;
$$;

-- Función: SuperAdmin ve todas las solicitudes pendientes
create or replace function get_pending_limit_requests()
returns table (
  id              uuid,
  polla_id        uuid,
  polla_nombre    text,
  admin_id        uuid,
  admin_email     text,
  current_limit   int,
  requested_limit int,
  status          text,
  notes           text,
  created_at      timestamptz
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
      r.id,
      r.polla_id,
      p.nombre   as polla_nombre,
      r.admin_id,
      u.email    as admin_email,
      r.current_limit,
      r.requested_limit,
      r.status,
      r.notes,
      r.created_at
    from participant_limit_requests r
    join pollas      p on p.id = r.polla_id
    join auth.users  u on u.id = r.admin_id
    where r.status = 'pending'
    order by r.created_at asc;
end;
$$;

-- ─────────────────────────────────────────────
-- 2. Trigger: límite de participantes por polla
--    Límite base: 50. Si hay una solicitud aprobada, usa ese límite.
-- ─────────────────────────────────────────────
create or replace function check_participant_limit()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_count int;
  v_limit int;
begin
  -- Solo aplica al aprobar un participante
  if NEW.status != 'authorized' then
    return NEW;
  end if;

  -- Contar participantes ya autorizados (sin contar el actual)
  select count(*) into v_count
    from polla_participants
    where polla_id = NEW.polla_id
      and status = 'authorized'
      and id != NEW.id;

  -- Buscar límite personalizado aprobado; default 50
  select coalesce(
    (select requested_limit
     from participant_limit_requests
     where polla_id = NEW.polla_id and status = 'approved'
     order by created_at desc
     limit 1),
    50
  ) into v_limit;

  if v_count >= v_limit then
    raise exception 'Esta polla ya alcanzó el límite de % participantes. Solicita una expansión al administrador del sistema.', v_limit;
  end if;

  return NEW;
end;
$$;

-- Aplicar el trigger en UPDATE (cuando admin aprueba un participante)
drop trigger if exists enforce_participant_limit on polla_participants;
create trigger enforce_participant_limit
  before update of status on polla_participants
  for each row
  execute function check_participant_limit();

-- ─────────────────────────────────────────────
-- 3. Fix seguridad: recrear standings_view sin user_id
--    user_id no debe ser visible para todos los participantes
-- ─────────────────────────────────────────────
drop view if exists standings_view;
create view standings_view as
select
  pp.polla_id,
  pp.id as participant_id,
  pp.apodo,
  coalesce(sum(
    case
      when pred.pick::text = m.resultado::text then j.puntos_por_acierto
      else 0
    end
  ), 0) as puntos_totales,
  count(pred.id) as total_predicciones,
  count(case when pred.pick::text = m.resultado::text then 1 end) as aciertos,
  count(case when pred.is_default = true then 1 end) as predicciones_default
from polla_participants pp
left join predictions pred on pred.participant_id = pp.id
left join matches m on m.id = pred.match_id and m.resultado is not null
left join jornadas j on j.id = m.jornada_id
where pp.status = 'authorized'
group by pp.polla_id, pp.id, pp.apodo
order by puntos_totales desc;
