-- ============================================================
-- Polla Mundialista 2026 — Schema inicial
-- ============================================================

-- Habilitar extensiones necesarias
create extension if not exists "uuid-ossp";
create extension if not exists "pg_cron";

-- ============================================================
-- TIPOS ENUM
-- ============================================================

create type participant_status as enum ('pending', 'authorized', 'blocked');
create type pick_type as enum ('A_wins', 'draw', 'B_wins');
create type match_result as enum ('A_wins', 'draw', 'B_wins');

-- ============================================================
-- TABLA: profiles
-- Un perfil por usuario de auth
-- ============================================================

create table profiles (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  nombre_completo text not null,
  created_at timestamptz not null default now()
);

alter table profiles enable row level security;

-- Cada usuario puede ver y editar solo su propio perfil
create policy "profiles: select own" on profiles
  for select using (auth.uid() = user_id);

create policy "profiles: insert own" on profiles
  for insert with check (auth.uid() = user_id);

create policy "profiles: update own" on profiles
  for update using (auth.uid() = user_id);

-- Trigger para crear perfil al registrarse
create or replace function handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into profiles (user_id, nombre_completo)
  values (new.id, coalesce(new.raw_user_meta_data->>'nombre_completo', 'Usuario'));
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- ============================================================
-- TABLA: pollas
-- Cada polla es un ambiente independiente
-- ============================================================

create table pollas (
  id uuid primary key default uuid_generate_v4(),
  nombre text not null,
  admin_user_id uuid not null references auth.users(id) on delete cascade,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table pollas enable row level security;

-- Lectura: cualquier usuario autenticado puede ver pollas activas
create policy "pollas: select authenticated" on pollas
  for select using (auth.role() = 'authenticated');

-- Insertar: cualquier usuario puede crear pollas (se convierte en admin)
create policy "pollas: insert authenticated" on pollas
  for insert with check (auth.uid() = admin_user_id);

-- Actualizar/Eliminar: solo el admin de la polla
create policy "pollas: update admin" on pollas
  for update using (auth.uid() = admin_user_id);

create policy "pollas: delete admin" on pollas
  for delete using (auth.uid() = admin_user_id);

-- ============================================================
-- TABLA: polla_participants
-- Participantes de una polla con estado de autorización
-- ============================================================

create table polla_participants (
  id uuid primary key default uuid_generate_v4(),
  polla_id uuid not null references pollas(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  apodo text not null,
  status participant_status not null default 'pending',
  created_at timestamptz not null default now(),
  unique(polla_id, user_id)
);

alter table polla_participants enable row level security;

-- Lectura: participantes autorizados y el admin pueden ver la lista
create policy "polla_participants: select" on polla_participants
  for select using (
    auth.uid() = user_id
    or exists (
      select 1 from pollas where id = polla_id and admin_user_id = auth.uid()
    )
    or exists (
      select 1 from polla_participants pp2
      where pp2.polla_id = polla_participants.polla_id
        and pp2.user_id = auth.uid()
        and pp2.status = 'authorized'
    )
  );

-- Insertar: el propio usuario se registra
create policy "polla_participants: insert own" on polla_participants
  for insert with check (auth.uid() = user_id);

-- Actualizar: solo el admin (para cambiar status)
create policy "polla_participants: update admin" on polla_participants
  for update using (
    exists (select 1 from pollas where id = polla_id and admin_user_id = auth.uid())
  );

-- El participante puede actualizar su propio apodo
create policy "polla_participants: update own apodo" on polla_participants
  for update using (auth.uid() = user_id);

-- ============================================================
-- TABLA: jornadas
-- Agrupación de partidos dentro de una polla
-- ============================================================

create table jornadas (
  id uuid primary key default uuid_generate_v4(),
  polla_id uuid not null references pollas(id) on delete cascade,
  nombre text not null,
  orden int not null default 0,
  puntos_por_acierto int not null default 3,
  created_at timestamptz not null default now()
);

alter table jornadas enable row level security;

-- Lectura: participantes autorizados y admin
create policy "jornadas: select" on jornadas
  for select using (
    exists (
      select 1 from pollas where id = polla_id and admin_user_id = auth.uid()
    )
    or exists (
      select 1 from polla_participants
      where polla_id = jornadas.polla_id
        and user_id = auth.uid()
        and status = 'authorized'
    )
  );

-- CRUD: solo admin
create policy "jornadas: insert admin" on jornadas
  for insert with check (
    exists (select 1 from pollas where id = polla_id and admin_user_id = auth.uid())
  );

create policy "jornadas: update admin" on jornadas
  for update using (
    exists (select 1 from pollas where id = polla_id and admin_user_id = auth.uid())
  );

create policy "jornadas: delete admin" on jornadas
  for delete using (
    exists (select 1 from pollas where id = polla_id and admin_user_id = auth.uid())
  );

-- ============================================================
-- TABLA: matches
-- Partidos con fecha/hora, estado y resultado
-- ============================================================

create table matches (
  id uuid primary key default uuid_generate_v4(),
  polla_id uuid not null references pollas(id) on delete cascade,
  jornada_id uuid not null references jornadas(id) on delete cascade,
  equipo_a text not null,
  equipo_b text not null,
  fecha_hora timestamptz not null,
  estadio text,
  is_unlocked boolean not null default false,
  resultado match_result default null,
  created_at timestamptz not null default now()
);

alter table matches enable row level security;

-- Lectura: participantes autorizados y admin
create policy "matches: select" on matches
  for select using (
    exists (
      select 1 from pollas where id = polla_id and admin_user_id = auth.uid()
    )
    or exists (
      select 1 from polla_participants
      where polla_id = matches.polla_id
        and user_id = auth.uid()
        and status = 'authorized'
    )
  );

-- CRUD: solo admin
create policy "matches: insert admin" on matches
  for insert with check (
    exists (select 1 from pollas where id = polla_id and admin_user_id = auth.uid())
  );

create policy "matches: update admin" on matches
  for update using (
    exists (select 1 from pollas where id = polla_id and admin_user_id = auth.uid())
  );

create policy "matches: delete admin" on matches
  for delete using (
    exists (select 1 from pollas where id = polla_id and admin_user_id = auth.uid())
  );

-- ============================================================
-- TABLA: predictions
-- Predicciones de cada participante por partido
-- ============================================================

create table predictions (
  id uuid primary key default uuid_generate_v4(),
  polla_id uuid not null references pollas(id) on delete cascade,
  match_id uuid not null references matches(id) on delete cascade,
  participant_id uuid not null references polla_participants(id) on delete cascade,
  pick pick_type not null,
  is_default boolean not null default false,
  submitted_at timestamptz not null default now(),
  unique(match_id, participant_id)
);

alter table predictions enable row level security;

-- SELECT:
--   - Participante ve siempre sus propias predicciones
--   - Predicciones ajenas solo visibles si el partido ya está bloqueado
--     (fecha_hora <= now() - 1 minuto)
create policy "predictions: select" on predictions
  for select using (
    -- siempre ves las tuyas
    exists (
      select 1 from polla_participants pp
      where pp.id = participant_id and pp.user_id = auth.uid()
    )
    or
    -- predicciones ajenas: solo si el partido ya cerró
    (
      exists (
        select 1 from matches m
        where m.id = match_id
          and m.fecha_hora <= (now() - interval '1 minute')
      )
      and
      exists (
        select 1 from polla_participants pp
        where pp.polla_id = predictions.polla_id
          and pp.user_id = auth.uid()
          and pp.status = 'authorized'
      )
    )
    or
    -- admin siempre ve todo
    exists (
      select 1 from pollas where id = polla_id and admin_user_id = auth.uid()
    )
  );

-- INSERT: participante autorizado puede predecir mientras el partido esté abierto
create policy "predictions: insert" on predictions
  for insert with check (
    exists (
      select 1 from polla_participants pp
      where pp.id = participant_id
        and pp.user_id = auth.uid()
        and pp.status = 'authorized'
    )
    and exists (
      select 1 from matches m
      where m.id = match_id
        and m.is_unlocked = true
        and m.fecha_hora > (now() + interval '1 minute')
    )
  );

-- UPDATE: participante puede cambiar predicción si el partido sigue abierto
create policy "predictions: update own" on predictions
  for update using (
    exists (
      select 1 from polla_participants pp
      where pp.id = participant_id and pp.user_id = auth.uid()
    )
    and exists (
      select 1 from matches m
      where m.id = match_id
        and m.is_unlocked = true
        and m.fecha_hora > (now() + interval '1 minute')
    )
  );

-- INSERT por sistema (predicciones default): via service role en Edge Function
-- (no requiere RLS check cuando se usa service_role key)

-- ============================================================
-- FUNCIÓN: assign_default_predictions
-- Asigna "draw" a todos los participantes que no predijeron
-- a tiempo. Llamada por pg_cron cada minuto.
-- ============================================================

create or replace function assign_default_predictions()
returns void language plpgsql security definer as $$
declare
  v_match record;
  v_participant record;
begin
  -- Iterar sobre partidos que acaban de cerrar (entre 1 y 2 minutos atrás)
  -- y que están desbloqueados (activos para predicciones)
  for v_match in
    select m.id as match_id, m.polla_id
    from matches m
    where m.is_unlocked = true
      and m.fecha_hora <= (now() - interval '1 minute')
      and m.fecha_hora > (now() - interval '2 minutes')
  loop
    -- Para cada participante autorizado sin predicción en ese partido
    for v_participant in
      select pp.id as participant_id
      from polla_participants pp
      where pp.polla_id = v_match.polla_id
        and pp.status = 'authorized'
        and not exists (
          select 1 from predictions p
          where p.match_id = v_match.match_id
            and p.participant_id = pp.id
        )
    loop
      insert into predictions (polla_id, match_id, participant_id, pick, is_default)
      values (v_match.polla_id, v_match.match_id, v_participant.participant_id, 'draw', true);
    end loop;
  end loop;
end;
$$;

-- ============================================================
-- VISTA: standings_view
-- Puntos acumulados por participante en una polla
-- ============================================================

create or replace view standings_view as
select
  pp.polla_id,
  pp.id as participant_id,
  pp.apodo,
  pp.user_id,
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
group by pp.polla_id, pp.id, pp.apodo, pp.user_id
order by puntos_totales desc;

-- ============================================================
-- PROGRAMAR pg_cron: cada minuto asigna predicciones default
-- ============================================================
-- Ejecutar después de habilitar pg_cron en Supabase Dashboard:
--
-- select cron.schedule(
--   'assign-default-predictions',
--   '* * * * *',
--   'select assign_default_predictions()'
-- );
