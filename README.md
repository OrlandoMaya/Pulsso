# Pulsso

Calendario semanal y mensual con eventos, tareas recurrentes que se pueden tachar y cuentas por usuario.

Monorepo con **pnpm workspaces**:

```
apps/
└── api/   # NestJS + MongoDB Atlas (Mongoose) + JWT
            # (el frontend React + shadcn irá en apps/web)
```

## Requisitos

- Node 20+
- pnpm 10 (`corepack enable`)
- Un cluster de MongoDB Atlas (el gratuito M0 sirve)

## Configurar MongoDB Atlas

1. En Atlas crea un cluster y, en **Database Access**, un usuario con permiso *readWrite*.
2. En **Network Access** agrega tu IP (o la del servidor donde corra la API).
3. En **Database → Connect → Drivers** copia la cadena `mongodb+srv://…`
   y agrégale el nombre de la base, p. ej. `…mongodb.net/pulsso?retryWrites=true&w=majority`.

## Correr la API

```bash
pnpm install
cp apps/api/.env.example apps/api/.env   # pega tu MONGODB_URI y un JWT_SECRET largo
pnpm dev:api                             # http://localhost:3000/api
```

| Variable | Descripción |
|---|---|
| `MONGODB_URI` | Cadena de conexión de Atlas |
| `JWT_SECRET` | Secreto para firmar sesiones (mín. 32 caracteres; `openssl rand -base64 48`) |
| `JWT_EXPIRES_IN` | Duración de la sesión (por defecto `7d`) |
| `PORT` | Puerto (por defecto `3000`) |
| `CORS_ORIGIN` | Origen(es) del frontend separados por coma (por defecto `http://localhost:5173`) |

## Pruebas

```bash
pnpm --filter @pulsso/api test        # unitarias (recurrencia)
pnpm --filter @pulsso/api test:e2e    # e2e: Mongo en memoria, o MONGODB_TEST_URI si la defines
```

> `MONGODB_TEST_URI` debe apuntar a una base **solo para pruebas**: la suite la borra al empezar.

## Cómo funciona

- **Cuentas privadas**: todas las rutas (salvo `auth/register`, `auth/login` y `health`) exigen
  `Authorization: Bearer <token>`, y cada consulta se filtra por el usuario del token. Un recurso de
  otra persona responde `404`. Al registrarse se crean 5 calendarios: Trabajo, Equipo, Clientes,
  Personal y Otros.
- **Horas "flotantes"**: fechas con hora como `2026-09-21T09:00` (hora local, sin zona). Así la
  repetición no se mueve con los cambios de horario.
- **Repetición**: reglas [RRULE](https://icalendar.org/iCalendar-RFC-5545/3-8-5-3-recurrence-rule.html)
  sin `DTSTART`, p. ej. `FREQ=DAILY`, `FREQ=WEEKLY;BYDAY=MO,WE,FR`, `FREQ=MONTHLY;BYMONTHDAY=1`.
  Se permiten `DAILY`, `WEEKLY`, `MONTHLY` y `YEARLY`.
- **Tachar**: se guarda por ocurrencia (evento/tarea + día). Tachar "Meditar" el lunes no lo tacha
  el martes.
- **Eventos a la misma hora**: la API los devuelve ordenados por hora; el frontend los reparte en
  columnas.

## Endpoints (`/api`)

| Método | Ruta | Descripción |
|---|---|---|
| `POST` | `/auth/register` | `{ name, email, password }` → `{ accessToken, user }` |
| `POST` | `/auth/login` | `{ email, password }` → `{ accessToken, user }` |
| `GET` | `/auth/me` | Usuario de la sesión |
| `GET` `POST` | `/calendars` | Listar / crear `{ name, color, visible? }` |
| `PATCH` `DELETE` | `/calendars/:id` | Editar / borrar (borra también sus eventos y tareas) |
| `POST` | `/events` | `{ calendarId, title, start, end, notes?, rrule?, checkable? }` |
| `GET` `PATCH` `DELETE` | `/events/:id` | Ver / editar (`rrule: null` quita la repetición) / borrar |
| `POST` | `/events/:id/exdates` | `{ date }` borra solo esa ocurrencia |
| `GET` `POST` | `/tasks` | Tareas recurrentes sin hora `{ calendarId, title, startDate, rrule }` |
| `PATCH` `DELETE` | `/tasks/:id` | Editar / borrar |
| `POST` | `/tasks/:id/exdates` | `{ date }` quita la tarea solo ese día |
| `PUT` | `/completions` | `{ sourceType: 'event'\|'task', sourceId, date, done }` tacha o destacha |
| `GET` | `/agenda?from=YYYY-MM-DD&to=YYYY-MM-DD[&calendarIds=a,b]` | Días del rango (vista semana/mes, máx. 62 días) |
| `GET` | `/agenda/day/:date` | Todo lo de un día: alimenta el **modal del día** |

Cada día de la agenda tiene esta forma:

```json
{
  "date": "2026-09-26",
  "progress": { "done": 1, "total": 3 },
  "tasks": [
    { "sourceType": "task", "sourceId": "…", "calendarId": "…", "color": "emerald", "title": "Meditar 10 min", "done": true }
  ],
  "events": [
    { "sourceType": "event", "sourceId": "…", "calendarId": "…", "color": "amber", "title": "Taller de React",
      "start": "2026-09-26T10:00", "end": "2026-09-26T12:00", "recurring": false, "checkable": false, "done": false }
  ]
}
```

Si no mandas `calendarIds`, la agenda incluye solo los calendarios con `visible: true`.
