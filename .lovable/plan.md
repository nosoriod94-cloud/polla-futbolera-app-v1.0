

# Plan: Polla Mundialista Osorio - React Web App

## Resumen del proyecto original

La "Polla Mundialista" es una app familiar colombiana para el Mundial FIFA 2026 donde los participantes registran pronosticos de partidos y compiten por puntos. Actualmente es vanilla HTML/CSS/JS con localStorage. La app tiene:

- **48 equipos** organizados en 12 grupos (A-L)
- **8 fases** del torneo (3 de grupos + 5 eliminatorias)
- **Sistema de puntos** configurable (3-10 pts segun fase)
- **Panel admin** con contrasena para ingresar resultados
- **Formularios de pronostico** con bloqueo por fecha limite
- **Tabla de posiciones** y vista de transparencia
- **Dark mode**, navegacion tipo app movil

## Lo que vamos a construir

Reconstruccion completa en React/TypeScript/Tailwind con Supabase como backend para manejo de datos robusto (reemplazando localStorage).

---

## Fase 1: Fundacion (primera iteracion)

### 1. Configurar Supabase (Lovable Cloud)
- Tabla `participants` (id, nombre, apodo, created_at)
- Tabla `matches` (id, phase, group_name, team_a, team_b, datetime, stadium)
- Tabla `predictions` (id, participant_id, phase, match_id, pick, submitted_at)
- Tabla `results` (id, match_id, result)
- Tabla `config` (id, key, value) para deadlines, puntos, admin password
- Tabla `user_roles` para admin (siguiendo patron de seguridad requerido)
- RLS policies para lectura publica y escritura controlada

### 2. Data Layer - Migrar datos del torneo
- Crear archivo `src/data/tournament.ts` con los 48 equipos, grupos, y partidos iniciales
- Seed script para poblar la base de datos con los partidos de fase de grupos
- Hook `useTournament` para acceso a datos

### 3. Paginas y Routing
- `/` - Inicio (hero mundialista + stats + fases)
- `/pronosticos` - Lista de fases y formularios
- `/pronosticos/:phaseId` - Formulario de pronostico
- `/posiciones` - Tabla de posiciones
- `/transparencia` - Vista de pronosticos por participante
- `/perfil` - Registro/seleccion de usuario
- `/admin` - Panel de administracion

### 4. Navegacion inferior tipo app movil
- Barra fija inferior con iconos: Inicio, Pronosticos, Posiciones, Mi Perfil
- Estilo moderno con indicador activo animado

---

## Fase 2: Funcionalidades Core

### 5. Pagina de Inicio
- Hero con gradiente mundialista (colores vibrantes FIFA 2026)
- Estadisticas en vivo (jugadores, resultados, lider)
- Acciones rapidas (llenar pronosticos, ver posiciones, registrarse)
- Timeline de fases del torneo con estados

### 6. Sistema de Registro/Perfil
- Formulario: nombre completo + apodo
- Seleccion de usuario existente
- Persistencia en Supabase

### 7. Formularios de Pronostico
- Cards por partido: bandera + nombre equipo A vs equipo B + bandera
- Toggle buttons con feedback visual (Gana A / Empate / Gana B)
- Validacion completa, bloqueo por deadline
- Confetti al enviar, modal de confirmacion
- Un solo envio por fase por participante

### 8. Panel de Administracion
- Login con contrasena (validacion server-side via Supabase)
- Ingresar resultados reales por partido
- Configurar deadlines por fase
- Configurar puntos por fase
- Agregar partidos de fases eliminatorias
- Export/Import JSON

### 9. Tabla de Posiciones
- Ranking ordenado por puntos
- Desglose por fase
- Animaciones de cambio de posicion
- Highlight del lider con corona/medalla

### 10. Vista de Transparencia
- Pronosticos visibles solo despues del deadline
- Comparacion lado a lado: pronostico vs resultado real
- Verde = acierto, Rojo = fallo

---

## Fase 3: UI/UX Premium

### 11. Diseno visual
- Paleta vibrante inspirada en FIFA 2026 (azules, rojos, dorados)
- Tipografia con caracter: fuente display para titulos
- Emojis de banderas para todos los equipos
- Micro-interacciones en seleccion de pronosticos
- Dark mode toggle
- Mobile-first, totalmente responsive

---

## Detalles tecnicos

```text
src/
├── data/
│   └── tournament.ts          # Equipos, grupos, partidos, puntos
├── hooks/
│   ├── useTournament.ts       # Datos del torneo
│   ├── useParticipants.ts     # CRUD participantes
│   ├── usePredictions.ts      # CRUD pronosticos
│   └── useScoring.ts          # Calculo de puntos
├── pages/
│   ├── Home.tsx               # Inicio
│   ├── Predictions.tsx        # Lista de fases
│   ├── PredictionForm.tsx     # Formulario por fase
│   ├── Standings.tsx          # Tabla de posiciones
│   ├── Transparency.tsx       # Vista de pronosticos
│   ├── Profile.tsx            # Registro/perfil
│   └── Admin.tsx              # Panel admin
├── components/
│   ├── BottomNav.tsx          # Navegacion inferior
│   ├── MatchCard.tsx          # Card de partido
│   ├── PredictionToggle.tsx   # Selector de pronostico
│   ├── StandingsTable.tsx     # Tabla de posiciones
│   ├── PhaseTimeline.tsx      # Timeline de fases
│   └── CountdownTimer.tsx     # Cuenta regresiva
└── lib/
    └── scoring.ts             # Logica de calculo de puntos
```

**Stack**: React + TypeScript + Tailwind + shadcn/ui + Supabase (Lovable Cloud)
**Datos**: Migracion completa de localStorage a Supabase con RLS
**Seguridad**: Admin role via tabla `user_roles`, validacion server-side

---

## Propuesta de ejecucion

Empezare con la **Fase 1** completa: configurar Supabase, migrar los datos del torneo, crear todas las paginas con routing y la navegacion inferior. Esto dara la estructura completa sobre la cual construir las funcionalidades.

