# Pulsso

Calendario semanal y mensual con eventos, tareas recurrentes que se pueden tachar y cuentas por usuario.

Monorepo con **pnpm workspaces**:

```
backend/    # API: NestJS + MongoDB Atlas (Mongoose) + JWT
frontend/   # App: React 19 + Vite + Tailwind v4 + shadcn/ui
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

## Correr el proyecto

```bash
pnpm install
cp backend/.env.example backend/.env   # pega tu MONGODB_URI y un JWT_SECRET largo
pnpm dev:api                           # API en http://localhost:4000/api
pnpm dev:web                           # App en http://localhost:4040 (reenvía /api al backend)
```

Abre http://localhost:4040, crea tu cuenta y listo.

### Variables del backend (`backend/.env`)

| Variable | Descripción |
|---|---|
| `MONGODB_URI` | Cadena de conexión de Atlas |
| `JWT_SECRET` | Secreto para firmar sesiones (mín. 32 caracteres; `openssl rand -base64 48`) |
| `JWT_EXPIRES_IN` | Duración de la sesión (por defecto `7d`) |
| `PORT` | Puerto (por defecto `4000`) |
| `CORS_ORIGIN` | Origen(es) del frontend separados por coma (por defecto `http://localhost:4040`) |
| `TRUST_PROXY` | Número de proxies delante de la API (`1` detrás de nginx). Déjalo vacío si la API está expuesta directo |

### Variables del frontend (`frontend/.env`, opcional)

| Variable | Descripción |
|---|---|
| `VITE_API_URL` | URL del backend en producción, p. ej. `https://api.midominio.com`. En desarrollo déjala vacía. |

## Docker

Cada proyecto tiene su `Dockerfile` y hay un `docker-compose.yml` en la raíz. Las imágenes se construyen
desde la raíz del repo porque el lockfile de pnpm es compartido.

```bash
cp backend/.env.example backend/.env   # MONGODB_URI de Atlas + JWT_SECRET
docker compose up --build              # → http://localhost:4040
```

- **backend** (`backend/Dockerfile`): Node 22 Alpine en varias etapas (compila con dependencias de desarrollo
  y la imagen final lleva solo las de producción). Corre como usuario `node`, con *healthcheck* en
  `/api/health`. Las credenciales llegan por variables de entorno (`env_file`), nunca dentro de la imagen.
  No se publica al exterior: solo nginx lo alcanza por la red interna de compose.
- **frontend** (`frontend/Dockerfile`): compila con Vite y sirve con nginx. `nginx.conf.template` atiende las
  rutas de React, cachea `/assets` y reenvía `/api` al backend (`API_UPSTREAM`, por defecto
  `http://backend:4000`), así que no hace falta CORS.
- `TRUST_PROXY=1` (ya puesto en compose) hace que la API use la IP real del cliente para el límite de intentos
  de login en lugar de la de nginx.
- Para que la app llame a una API en otro dominio: `docker build -f frontend/Dockerfile --build-arg
  VITE_API_URL=https://api.midominio.com .`
- En Atlas, agrega en **Network Access** la IP pública del servidor donde corra el contenedor.

Construir por separado:

```bash
docker build -f backend/Dockerfile -t pulsso-backend .
docker build -f frontend/Dockerfile -t pulsso-frontend .
```

## Pruebas y calidad

```bash
pnpm test                                   # backend (recurrencia) + frontend (columnas, fechas, reglas)
pnpm --filter @pulsso/backend test:e2e      # e2e del API: Mongo en memoria, o MONGODB_TEST_URI si la defines
pnpm lint                                   # tipos (y oxlint en el frontend)
pnpm format                                 # prettier
```

> `MONGODB_TEST_URI` debe apuntar a una base **solo para pruebas**: la suite la borra al empezar.

## Frontend

- **Login / Crear cuenta** (`/login`): la sesión se guarda en el navegador; si el token vence, vuelve al login.
- **Día** (`/dia/:fecha?categoria=<id>`): lista de **tareas** del día (las mismas que ves en la semana, el mes y el
  modal), con **descripción**, filtro por **categoría** ("Todas", Trabajo, Personal…; se recuerda la última).
  Se tachan, se editan en línea (título y descripción), se reordenan **arrastrando** desde el asa ⋮⋮, se pasan a
  mañana o a otra categoría, y "Pasar pendientes a mañana" mueve las tareas normales no hechas al día siguiente.
  Al lado, los eventos del día.
- **Semana** (`/semana/:fecha`): rejilla de 24 h, franja **Tareas** con las tareas del día para tachar,
  eventos que coinciden en hora en columnas lado a lado y línea de la hora actual. Clic en un hueco crea
  un evento a esa hora; clic en el día abre su modal.
- **Mes** (`/mes/:fecha`): cada día muestra sus tareas tachables, su avance (hechas/total), hasta dos filas
  de eventos (los simultáneos comparten fila) y "+N más". En móvil se resume con puntos.
- **Modal del día** (`?dia=YYYY-MM-DD`): la misma lista de tareas y el mismo formulario para agregar que la vista Día,
  y debajo los eventos (los que coinciden en hora, "Al mismo tiempo").
- **Modo oscuro**: Claro / Oscuro / Sistema desde el botón de la luna o el menú de cuenta (también en el
  login). Se guarda en el navegador y se aplica antes de pintar, sin parpadeo.
- **Responsive**: en pantallas chicas la barra lateral se abre como panel desde el botón de menú, la semana se
  desplaza de lado con la columna de horas fija, el mes se resume con puntos y hay un botón flotante "+".
- **Cuatro cosas** (botón "Nuevo" y editor con dos selectores: *Evento / Tarea* y *Normal / Recurrente*):
  - **Evento normal**: con hora de inicio y fin o **todo el día** (feriado). Puede durar **varios días**: con *Todo el
    día* eliges *Desde* / *Hasta* (vacaciones) y con horario eliges fecha y hora de inicio y de fin (un viaje del
    viernes 18:00 al domingo 12:00). Máximo 366 días.
  - **Evento recurrente**: se repite (todos los días, de lunes a viernes, ciertos días, cada mes o cada año, con fin
    opcional), con horario o **todo el día** (cumpleaños = recurrente cada año, todo el día).
  - **Tarea normal**: algo por hacer un solo día; se tacha.
  - **Tarea recurrente**: se repite y se tacha cada vez.

  Los eventos no se tachan; las tareas sí. Los eventos de todo el día y los de varios días van como **barra** en la
  fila "Todo el día" de la semana y arriba de cada día en el mes, continua de un día al otro. Las tareas van en la franja "Tareas". El avance (hechas/total) cuenta solo tareas.
- **Categorías**: dan el color a cada evento. Al registrarte se crean Trabajo, Equipo, Clientes, Personal y Otros.
  En la barra lateral puedes crearlas (**+**), editarlas (nombre y color) o eliminarlas desde **···**; al eliminar se
  avisa cuántos eventos y tareas se borran con ella y siempre debe quedar al menos una. En la API se llaman `calendars`.

Estructura:

```
frontend/src/
├── components/ui/        # componentes shadcn (button, dialog, select, checkbox…)
├── features/auth/        # AuthProvider, LoginPage, RequireAuth
├── features/calendar/    # CalendarPage, Sidebar, Toolbar, DayDialog, EditorDialog, week/, month/
└── lib/                  # api, fechas, colores, overlap (columnas), recurrence (RRULE)
```

`components.json` está listo para agregar más componentes con `pnpm dlx shadcn@latest add <componente>`
dentro de `frontend/`.

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
  columnas (`frontend/src/lib/overlap.ts`).

## Endpoints (`/api`)

| Método | Ruta | Descripción |
|---|---|---|
| `POST` | `/auth/register` | `{ name, email, password }` → `{ accessToken, user }` |
| `POST` | `/auth/login` | `{ email, password }` → `{ accessToken, user }` |
| `GET` | `/auth/me` | Usuario de la sesión |
| `GET` `POST` | `/calendars` | Listar / crear `{ name, color, visible? }` |
| `PATCH` `DELETE` | `/calendars/:id` | Editar / borrar (borra también sus eventos y tareas; no se puede borrar la última) |
| `GET` | `/calendars/:id/usage` | `{ events, tasks }` que se perderían al borrarla |
| `POST` | `/events` | `{ calendarId, title, start, end, notes?, rrule?, checkable?, allDay? }` (`allDay`: días completos de la fecha de `start` a la de `end`, ambos incluidos; se guarda hasta las 00:00 del día siguiente. Máx. 366 días) |
| `GET` `PATCH` `DELETE` | `/events/:id` | Ver / editar (`rrule: null` quita la repetición) / borrar |
| `POST` | `/events/:id/exdates` | `{ date }` borra solo esa ocurrencia |
| `GET` `POST` | `/tasks` | Tareas `{ calendarId, title, description?, startDate, rrule }` (normal = `FREQ=DAILY;COUNT=1`) |
| `PATCH` `DELETE` | `/tasks/:id` | Editar / borrar |
| `POST` | `/tasks/:id/exdates` | `{ date }` quita la tarea solo ese día |
| `PUT` | `/completions` | `{ sourceType: 'event'\|'task', sourceId, date, done }` tacha o destacha |
| `GET` | `/agenda?from=YYYY-MM-DD&to=YYYY-MM-DD[&calendarIds=a,b]` | Días del rango (vista semana/mes, máx. 62 días) |
| `GET` | `/agenda/day/:date` | Todo lo de un día: alimenta el **modal del día** |
| `PUT` | `/tasks/order` | `{ ids }` nuevo orden de las tareas |
| `POST` | `/tasks/carry-over` | `{ from, to, calendarIds? }` pasa las tareas normales no hechas a otro día |

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
