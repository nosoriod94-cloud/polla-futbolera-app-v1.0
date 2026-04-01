# Contexto de sesión — Polla Mundialista 2026
**Fecha:** Martes 31 de marzo de 2026 (Colombia, UTC-5)

## Estado actual del proyecto (al cierre de esta sesión)

### Lo que está construido y funcionando

- **Stack:** React + TypeScript + Vite + Tailwind + shadcn/ui + Supabase
- **Base de datos:** Supabase con migraciones 001 y 002 ejecutadas
- **Auth:** Supabase Auth (email + contraseña)
- **Deploy:** Solo local por ahora (`npm run dev` → http://localhost:8080)
- **Repo:** https://github.com/nosoriod94-cloud/lovable-polla-mundial-osorio

### Credenciales importantes
- **Supabase proyecto:** ihdktebszhvyuoykhhhx.supabase.co
- **Cuenta superadmin:** hola@pollafutbolera.online
- **UUID superadmin:** 6d77def4-6304-49b7-80f1-430d6ff2f2f5 (también en .env)

### Archivos clave del proyecto
```
src/
├── context/AuthContext.tsx          — Auth con Supabase
├── hooks/
│   ├── usePollas.ts                 — CRUD pollas + licencias
│   ├── useParticipants.ts           — CRUD participantes
│   ├── useMatches.ts                — CRUD jornadas y partidos
│   ├── usePredictions.ts            — CRUD predicciones + export
│   └── useStandings.ts              — Tabla de posiciones
├── pages/
│   ├── Auth.tsx                     — Login/registro usuarios normales
│   ├── Home.tsx                     — Lista de pollas (admin y participante)
│   ├── Admin.tsx                    — Panel admin de polla
│   ├── PollaView.tsx                — Vista participante (predecir/posiciones/transparencia)
│   ├── SuperAdmin.tsx               — Panel superadmin (generar licencias)
│   └── Perfil.tsx                   — Perfil de usuario
supabase/
├── migrations/001_initial_schema.sql  — Schema base completo
├── migrations/002_licenses.sql        — Licencias + invite_code
└── functions/assign-default-predictions/index.ts  — Edge Function Empate default
```

---

## Lo que falta implementar (PRÓXIMA SESIÓN)

### Rediseño del sistema de licencias y acceso superadmin

**Problema actual:**
- El superadmin (`hola@pollafutbolera.online`) usa el mismo login que los clientes (`/auth`)
- Las licencias son códigos genéricos que el cliente debe ingresar manualmente
- Cualquiera puede registrarse y ver la pantalla de "Nueva polla" aunque no tenga licencia

**Lo que se debe construir:**

#### 1. Login separado para superadmin → `/superadmin/login`
- Pantalla de login exclusiva para el superadmin
- Solo acepta `hola@pollafutbolera.online` (validado contra `VITE_SUPERADMIN_USER_ID`)
- Si ingresa otro correo, rechaza con mensaje claro
- El superadmin NO aparece en el flujo normal de la app (`/auth`)

#### 2. Licencia vinculada a un correo (no a un código genérico)
- En el panel `/superadmin`, el superadmin ingresa el **correo del cliente** y le otorga una licencia
- La tabla `licenses` cambia: en lugar de `code`, almacena `email_autorizado text`
- Cuando el cliente se registra con ese correo, automáticamente tiene licencia
- Cuando el cliente crea su polla, el sistema verifica que su `auth.email` tiene licencia disponible
- El cliente no ingresa ningún código — simplemente funciona

#### 3. Flujo completo rediseñado

**Superadmin:**
1. Entra a `/superadmin/login` con `hola@pollafutbolera.online`
2. En el panel escribe el correo del cliente → clic "Otorgar licencia"
3. Le avisa al cliente que ya puede registrarse

**Cliente (admin de su polla):**
1. Se registra en `/auth` con el correo que el superadmin autorizó
2. Ve la opción "Nueva polla" disponible (si no tiene licencia, no la ve)
3. Crea su polla — sin ingresar ningún código
4. Su polla está lista con un código de invitación corto (ej. `OSORIO26`) para compartir con participantes

**Participantes de una polla:**
1. Se registran en `/auth` con cualquier correo
2. En Home usan "Unirme a una polla" con el código corto
3. Esperan aprobación del admin

#### 4. Cambios en base de datos requeridos

```sql
-- Reemplazar columna 'code' por 'email_autorizado' en licenses
-- (requiere migración 003)
alter table licenses drop column code;
alter table licenses add column email_autorizado text not null unique;

-- La función create_license ahora recibe el email del cliente
-- La validación al crear polla verifica auth.email() contra licenses
```

#### 5. Archivos a modificar
| Archivo | Cambio |
|---|---|
| `supabase/migrations/003_licenses_by_email.sql` | Rediseño tabla licenses |
| `src/hooks/usePollas.ts` | `useCreatePolla` verifica por email, no por código |
| `src/pages/Home.tsx` | Eliminar campo "Clave de licencia" del formulario |
| `src/pages/SuperAdmin.tsx` | Input de email en lugar de botón "Generar licencia" |
| `src/pages/SuperAdminLogin.tsx` | Nueva pantalla de login exclusiva |
| `src/App.tsx` | Agregar ruta `/superadmin/login` |

---

## Instrucción para iniciar la próxima sesión

**Copiar y pegar esto al inicio de la nueva conversación:**

> Estoy trabajando en una app llamada Polla Mundialista 2026. El proyecto está en /Users/nicolasosorio/Library/CloudStorage/OneDrive-Personal/POLLA MUNDIALISTA 2026/lovable-polla-mundial-osorio. Lee el archivo CONTEXTO_SESION.md para entender el estado actual. Quiero implementar el rediseño del sistema de licencias y acceso superadmin descrito en la sección "Lo que falta implementar".
