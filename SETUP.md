# Setup: Polla Mundialista 2026

## 1. Crear proyecto en Supabase

1. Ve a [supabase.com](https://supabase.com) y crea un proyecto nuevo.
2. Copia la **Project URL** y la **anon public key** desde Settings → API.

## 2. Variables de entorno

Crea un archivo `.env` en la raíz del proyecto:

```
VITE_SUPABASE_URL=https://TU_PROYECTO.supabase.co
VITE_SUPABASE_ANON_KEY=TU_ANON_KEY
```

## 3. Correr la migración SQL

En el **SQL Editor** de Supabase, ejecuta el contenido de:

```
supabase/migrations/001_initial_schema.sql
```

Esto crea todas las tablas, tipos, RLS policies, y la función de predicciones default.

## 4. Activar pg_cron (predicciones por defecto = Empate)

En el SQL Editor de Supabase, ejecuta:

```sql
select cron.schedule(
  'assign-default-predictions',
  '* * * * *',
  $$select assign_default_predictions()$$
);
```

Esto asigna automáticamente "Empate" a todos los participantes que no prediccaron
en los 60 segundos anteriores al inicio de cada partido.

> Nota: pg_cron debe estar habilitado en tu proyecto de Supabase.
> Ve a Database → Extensions y activa `pg_cron`.

## 5. Iniciar la app

```bash
npm install
npm run dev
```

La app corre en http://localhost:8080

## Flujo de uso

### Admin
1. Regístrate y crea una cuenta
2. Desde el inicio, crea una polla nueva
3. Copia el ID de la polla y compártelo con los participantes
4. Ve al panel de admin y:
   - Crea jornadas con su nombre y puntos por acierto
   - Crea partidos con equipos, fecha/hora y estadio
   - Desbloquea los partidos que quieres abrir para predicciones
   - Aprueba las solicitudes de los participantes
   - Ingresa resultados cuando los partidos terminen
   - Descarga el CSV de predicciones cuando quieras

### Participante
1. Regístrate y crea una cuenta
2. Desde el inicio, usa "Unirme a una polla" con el ID que te dio el admin
3. Espera a que el admin te apruebe
4. Una vez aprobado, entra a la polla y haz tus predicciones
5. Las predicciones se bloquean 1 minuto antes del kickoff
6. Si no predijiste a tiempo, quedas automáticamente con "Empate"
7. Ve la tabla de posiciones y las predicciones de todos en "Ver todos"
