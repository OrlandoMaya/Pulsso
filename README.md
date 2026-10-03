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
cp .env.example .env                   # WEB_DOMAIN, API_DOMAIN y ACME_EMAIL
docker compose up -d --build           # → https://calendar.pulsso.online
```

- **caddy** (`deploy/Caddyfile`): la única entrada pública, en los puertos 80 y 443. Pone HTTPS solo, con certificados
  de Let's Encrypt que renueva él mismo, y reparte: `WEB_DOMAIN` → frontend, `API_DOMAIN` → backend.
- **backend** (`backend/Dockerfile`): Node 22 Alpine en varias etapas (compila con dependencias de desarrollo
  y la imagen final lleva solo las de producción). Corre como usuario `node`, con *healthcheck* en
  `/api/health`. Las credenciales llegan por variables de entorno (`env_file`), nunca dentro de la imagen.
  Solo escucha en `127.0.0.1:4000` del servidor; desde afuera se entra por Caddy. `CORS_ORIGIN` se arma con
  `WEB_DOMAIN` y `TRUST_PROXY=1` hace que use la IP real del cliente para el límite de intentos de login.
- **frontend** (`frontend/Dockerfile`): compila con Vite apuntando a `https://API_DOMAIN` (`VITE_API_URL`) y sirve
  con nginx (`nginx.conf.template`: rutas de React y caché de `/assets`).
- En Atlas, agrega en **Network Access** la IP pública del servidor donde corra el contenedor.

### Publicar con dominio (calendar.pulsso.online y calendar-api.pulsso.online)

1. En el DNS de `pulsso.online` crea dos registros **A**, `calendar` y `calendar-api`, con la IP del servidor.
   Si usas Cloudflare, déjalos en "solo DNS" (nube gris) al menos hasta que Caddy saque los certificados.
   Comprueba con `dig +short calendar.pulsso.online` que ya responden la IP.
2. En el servidor, deja libres los puertos 80 y 443 (`sudo ss -tlnp | grep -E ':(80|443) '` no debe mostrar nada) y
   ábrelos en el firewall: `sudo ufw allow 80,443/tcp` (y en el panel del proveedor si tiene firewall propio).
3. `git pull`, `cp .env.example .env` y pon tu correo en `ACME_EMAIL`.
4. `docker compose up -d --build` y mira cómo saca los certificados: `docker compose logs -f caddy`.
5. Prueba `https://calendar-api.pulsso.online/api/health` (→ `{"status":"ok"}`) y abre `https://calendar.pulsso.online`.

**Si el servidor ya tiene otro proyecto en el puerto 80:**

- **Con un nginx instalado en el servidor** (`sudo ss -tlnp | grep ':80 '` muestra `nginx`): borra `COMPOSE_PROFILES=caddy`
  de `.env` para que Caddy no arranque y agrega `deploy/nginx-pulsso.conf` a ese nginx (los pasos están en el archivo;
  el HTTPS lo pone `certbot`). Nginx separa los sitios por dominio, así que el otro proyecto sigue igual.
- **Con un Caddy de otro proyecto en el 80/443** (p. ej. un contenedor `edge-caddy`): en `.env` borra
  `COMPOSE_PROFILES=caddy` y activa `COMPOSE_FILE=docker-compose.yml:docker-compose.edge.yml` con `EDGE_NETWORK` = la red
  de ese Caddy (`docker inspect edge-caddy -f '{{range $k, $v := .NetworkSettings.Networks}}{{$k}} {{end}}'`). Luego pega
  `deploy/edge-caddy.caddy` en su Caddyfile y recárgalo. Él pone el HTTPS de los dos dominios.
- **Con varias IP en el servidor** y el otro proyecto escuchando solo en la suya: pon `BIND_IP=<IP de Pulsso>` en `.env`
  y Caddy usa el 80/443 de esa IP.

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
- **Subtareas**: cada tarea puede tener pasos. Se agregan en el editor o con "Agregar subtarea" en la tarjeta, se
  editan y quitan ahí mismo, y se tachan por día (en una recurrente, cada día empieza de cero). Al tachar todas, la
  tarea se tacha sola; tachar la tarea tacha todas. La semana y el mes muestran cuántas van (2/3).
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
- **Pendientes y proyectos** (`/pendientes`, botón **Proyectos** arriba o "Nuevo → Tarea general / Proyecto"):
  - **Tareas generales**: cosas por hacer sin día fijo (renovar el pasaporte). Se tachan, se editan en línea y se
    reordenan arrastrando.
  - **Proyectos**: cada uno abre un **lienzo** (`/proyectos/:id`) para armar un diagrama de actividades. Arrastras
    desde la paleta **Actividad**, **Decisión**, **Inicio** y **Fin**, y los unes con flechas desde los puntos de sus
    bordes; a las flechas de una decisión les pones etiqueta (Sí / No). Se guarda solo.
  - Cada actividad tiene estado (pendiente, **en progreso**, hecha): clic en su círculo para cambiarlo. Lo que está en
    progreso **late** y sus flechas llevan **pulsos** que viajan de una actividad a la otra; lo hecho queda en verde y lo
    que aún no llega, punteado. Al terminar una actividad, las que siguen se ponen en progreso solas (tras una decisión
    no: ahí eliges el camino).
  - Una actividad se **programa como tarea o como evento** desde su panel: abre el mismo editor del calendario y queda
    vinculada. En el calendario la tarea muestra el nombre del proyecto; tacharla allí la marca hecha en el diagrama (y
    al revés). Borrar la actividad o el proyecto deja lo programado en el calendario, sin vínculo.
- **Finanzas** (`/finanzas`, botón **Finanzas** arriba): en la vista Día y en el modal del día hay una sección
  **Gastos** para registrar lo gastado (nombre, monto y descripción opcional; el monto acepta `12.50`, `12,50` o
  `$1,234.50`). Se editan ahí mismo y el mes muestra lo gastado en cada día. La vista Finanzas, por mes, tiene el total
  gastado, el promedio por día, el día con más gasto, el **balance total** (todo lo registrado), una gráfica de columnas
  con lo gastado por día (al pasar el mouse muestra el total; clic abre el día; también se ve como tabla) y la lista de
  gastos del mes por día, con su formulario para agregar en cualquier fecha.
- **Categorías**: dan el color a cada evento. Al registrarte se crean Trabajo, Equipo, Clientes, Personal y Otros.
  En la barra lateral puedes crearlas (**+**), editarlas (nombre y color) o eliminarlas desde **···**; al eliminar se
  avisa cuántos eventos, tareas y proyectos se borran con ella y siempre debe quedar al menos una. En la API se llaman `calendars`.

Estructura:

```
frontend/src/
├── components/ui/        # componentes shadcn (button, dialog, select, checkbox…)
├── features/auth/        # AuthProvider, LoginPage, RequireAuth
├── features/calendar/    # CalendarPage, Sidebar, Toolbar, DayDialog, EditorDialog, week/, month/
├── features/projects/    # Pendientes, GeneralTaskDialog, ProjectPage y diagram/ (lienzo con React Flow)
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
| `GET` `POST` | `/tasks` | Tareas `{ calendarId, title, description?, startDate, rrule, subtasks?: [{ id, title }] }` (normal = `FREQ=DAILY;COUNT=1`) |
| `PATCH` `DELETE` | `/tasks/:id` | Editar / borrar |
| `POST` | `/tasks/:id/exdates` | `{ date }` quita la tarea solo ese día |
| `PUT` | `/completions` | `{ sourceType: 'event'\|'task', sourceId, date, done }` tacha o destacha (una tarea tacha también sus subtareas) |
| `PUT` | `/completions/subtask` | `{ taskId, subtaskId, date, done }` tacha una subtarea; responde `{ subtasksDone, done }` |
| `GET` `POST` | `/expenses?from=&to=` | Gastos del rango (máx. 400 días) / nuevo `{ date, title, description?, amount }` |
| `PATCH` `DELETE` | `/expenses/:id` | Editar / borrar un gasto |
| `GET` | `/expenses/summary?from=&to=` | `{ total, count, dailyAverage, max, days: [{ date, total, count }], allTime }` |
| `GET` | `/agenda?from=YYYY-MM-DD&to=YYYY-MM-DD[&calendarIds=a,b]` | Días del rango (vista semana/mes, máx. 62 días) |
| `GET` | `/agenda/day/:date` | Todo lo de un día: alimenta el **modal del día** |
| `PUT` | `/tasks/order` | `{ ids }` nuevo orden de las tareas |
| `POST` | `/tasks/carry-over` | `{ from, to, calendarIds? }` pasa las tareas normales no hechas a otro día |
| `GET` `POST` | `/general-tasks` | Tareas generales y proyectos `{ calendarId, title, description?, isProject? }` (la lista trae el avance de cada proyecto) |
| `GET` `PATCH` `DELETE` | `/general-tasks/:id` | Ver (con el diagrama y lo que cada actividad tiene en el calendario) / editar `{ title?, description?, calendarId?, done? }` / borrar |
| `PUT` | `/general-tasks/:id/diagram` | `{ nodes: [{ id, type, title, notes, x, y, status }], edges: [{ id, source, target, label }] }` |
| `PUT` | `/general-tasks/order` | `{ ids }` nuevo orden |

Para programar una actividad, `POST /tasks` o `POST /events` aceptan `projectId` y `nodeId`.

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
