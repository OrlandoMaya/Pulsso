import { INestApplication } from '@nestjs/common';
import { getConnectionToken } from '@nestjs/mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { Connection } from 'mongoose';
import request from 'supertest';
import { createApp } from './create-app';

/**
 * Suite completa contra MongoDB real. Usa MONGODB_TEST_URI si existe
 * (p. ej. un cluster de pruebas en Atlas); si no, levanta Mongo en memoria.
 */

describe('Pulsso API (e2e)', () => {
  let app: INestApplication;
  let mongo: MongoMemoryServer | undefined;
  let http: ReturnType<typeof request>;

  const register = async (email: string) => {
    const res = await http
      .post('/api/auth/register')
      .send({ name: 'Ana', email, password: 'secreta123' })
      .expect(201);
    return res.body.accessToken as string;
  };

  beforeAll(async () => {
    let uri = process.env.MONGODB_TEST_URI;
    if (!uri) {
      mongo = await MongoMemoryServer.create();
      uri = mongo.getUri('pulsso-test');
    }
    app = await createApp({ MONGODB_URI: uri });
    await app.get<Connection>(getConnectionToken()).dropDatabase();
    http = request(app.getHttpServer());
  });

  afterAll(async () => {
    await app?.close();
    await mongo?.stop();
  });

  it('health es público y el resto requiere sesión', async () => {
    await http.get('/api/health').expect(200);
    await http.get('/api/calendars').expect(401);
    await http.get('/api/agenda/day/2026-09-26').expect(401);
  });

  it('registro, login y /me', async () => {
    await register('ana@pulsso.dev');
    await http
      .post('/api/auth/register')
      .send({ name: 'Ana', email: 'ANA@pulsso.dev', password: 'secreta123' })
      .expect(409);
    await http
      .post('/api/auth/login')
      .send({ email: 'ana@pulsso.dev', password: 'mala-clave' })
      .expect(401);

    const login = await http
      .post('/api/auth/login')
      .send({ email: 'ana@pulsso.dev', password: 'secreta123' })
      .expect(200);
    expect(login.body.user).toMatchObject({ name: 'Ana', email: 'ana@pulsso.dev' });
    expect(login.body.user.passwordHash).toBeUndefined();

    const me = await http
      .get('/api/auth/me')
      .auth(login.body.accessToken, { type: 'bearer' })
      .expect(200);
    expect(me.body.email).toBe('ana@pulsso.dev');
  });

  it('agenda del día con tareas y eventos tachables, aislada por usuario', async () => {
    const tokenA = await register('a@pulsso.dev');
    const tokenB = await register('b@pulsso.dev');
    const asA = (r: request.Test) => r.auth(tokenA, { type: 'bearer' });
    const asB = (r: request.Test) => r.auth(tokenB, { type: 'bearer' });

    const calendars = await asA(http.get('/api/calendars')).expect(200);
    expect(calendars.body.map((c: { name: string }) => c.name)).toEqual([
      'Trabajo',
      'Equipo',
      'Clientes',
      'Personal',
      'Otros',
    ]);
    const personal = calendars.body[3].id;
    const trabajo = calendars.body[0].id;

    const task = await asA(http.post('/api/tasks'))
      .send({
        calendarId: personal,
        title: 'Meditar 10 min',
        startDate: '2026-09-01',
        rrule: 'FREQ=DAILY',
      })
      .expect(201);
    const gym = await asA(http.post('/api/events'))
      .send({
        calendarId: personal,
        title: 'Gimnasio',
        start: '2026-09-01T07:30',
        end: '2026-09-01T08:30',
        rrule: 'FREQ=WEEKLY;BYDAY=MO,WE,FR',
      })
      .expect(201);
    expect(gym.body).toMatchObject({ start: '2026-09-01T07:30', checkable: false });
    await asA(http.post('/api/events'))
      .send({
        calendarId: trabajo,
        title: 'Revisión de diseño',
        start: '2026-09-25T07:30',
        end: '2026-09-25T09:00',
      })
      .expect(201);

    // Viernes 25: tarea + 2 eventos a la misma hora
    const day = await asA(http.get('/api/agenda/day/2026-09-25')).expect(200);
    expect(day.body.tasks).toHaveLength(1);
    expect(day.body.events.map((e: { title: string }) => e.title)).toEqual([
      'Gimnasio',
      'Revisión de diseño',
    ]);
    // El avance cuenta solo tareas, no eventos
    expect(day.body.progress).toEqual({ done: 0, total: 1 });

    // Tachar
    await asA(http.put('/api/completions'))
      .send({ sourceType: 'task', sourceId: task.body.id, date: '2026-09-25', done: true })
      .expect(200);
    // Los eventos no se tachan
    await asA(http.put('/api/completions'))
      .send({ sourceType: 'event', sourceId: gym.body.id, date: '2026-09-25', done: true })
      .expect(400);
    const after = await asA(http.get('/api/agenda/day/2026-09-25')).expect(200);
    expect(after.body.progress).toEqual({ done: 1, total: 1 });
    expect(after.body.tasks[0].done).toBe(true);

    // Otro día no queda tachado
    const other = await asA(http.get('/api/agenda/day/2026-09-23')).expect(200);
    expect(other.body.progress).toEqual({ done: 0, total: 1 });

    // No se puede tachar un día en que no ocurre
    await asA(http.put('/api/completions'))
      .send({ sourceType: 'event', sourceId: gym.body.id, date: '2026-09-26', done: true })
      .expect(400);

    // Rango semanal
    const week = await asA(
      http.get('/api/agenda').query({ from: '2026-09-21', to: '2026-09-27' }),
    ).expect(200);
    expect(week.body.days).toHaveLength(7);
    expect(week.body.days.map((d: { events: unknown[] }) => d.events.length)).toEqual([
      1, 0, 1, 0, 2, 0, 0,
    ]);

    // El usuario B no ve nada de A
    await asB(http.get(`/api/events/${gym.body.id}`)).expect(404);
    await asB(http.patch(`/api/events/${gym.body.id}`))
      .send({ title: 'hack' })
      .expect(404);
    await asB(http.put('/api/completions'))
      .send({ sourceType: 'task', sourceId: task.body.id, date: '2026-09-25', done: false })
      .expect(404);
    await asB(http.post('/api/events'))
      .send({
        calendarId: personal,
        title: 'x',
        start: '2026-09-25T10:00',
        end: '2026-09-25T11:00',
      })
      .expect(404);
    const dayB = await asB(http.get('/api/agenda/day/2026-09-25')).expect(200);
    expect(dayB.body).toMatchObject({ tasks: [], events: [], progress: { done: 0, total: 0 } });
  });

  it('tareas: descripción, orden y pasar pendientes a mañana', async () => {
    const token = await register('d@pulsso.dev');
    const other = await register('e@pulsso.dev');
    const as = (r: request.Test, t = token) => r.auth(t, { type: 'bearer' });
    const cals = (await as(http.get('/api/calendars'))).body as { id: string; name: string }[];
    const work = cals.find((c) => c.name === 'Trabajo')!.id;
    const add = (title: string, rrule = 'FREQ=DAILY;COUNT=1', description = '') =>
      as(http.post('/api/tasks'))
        .send({ calendarId: work, title, description, startDate: '2026-09-26', rrule })
        .expect(201)
        .then((r) => r.body);

    const a = await add('Revisar PRs', undefined, 'Los del sprint 12');
    const b = await add('Preparar demo');
    const daily = await add('Meditar', 'FREQ=DAILY');
    expect(a).toMatchObject({ description: 'Los del sprint 12', position: 0 });
    expect(b.position).toBe(1);

    const day = await as(http.get('/api/agenda/day/2026-09-26')).expect(200);
    expect(day.body.tasks.map((t: { title: string }) => t.title)).toEqual([
      'Revisar PRs',
      'Preparar demo',
      'Meditar',
    ]);
    expect(day.body.tasks[0]).toMatchObject({ description: 'Los del sprint 12', recurring: false });
    expect(day.body.tasks[2].recurring).toBe(true);

    // Reordenar
    await as(http.put('/api/tasks/order'))
      .send({ ids: [daily.id, b.id, a.id] })
      .expect(200);
    const reordered = await as(http.get('/api/agenda/day/2026-09-26')).expect(200);
    expect(reordered.body.tasks.map((t: { title: string }) => t.title)).toEqual([
      'Meditar',
      'Preparar demo',
      'Revisar PRs',
    ]);
    await as(http.put('/api/tasks/order'), other)
      .send({ ids: [a.id] })
      .expect(404);

    // Tachar una y pasar pendientes: solo la normal no hecha se mueve; la recurrente no
    await as(http.put('/api/completions'))
      .send({ sourceType: 'task', sourceId: b.id, date: '2026-09-26', done: true })
      .expect(200);
    const moved = await as(http.post('/api/tasks/carry-over'))
      .send({ from: '2026-09-26', to: '2026-09-27' })
      .expect(200);
    expect(moved.body).toEqual({ moved: 1 });
    const tomorrow = await as(http.get('/api/agenda/day/2026-09-27')).expect(200);
    expect(tomorrow.body.tasks.map((t: { title: string }) => t.title).sort()).toEqual([
      'Meditar',
      'Revisar PRs',
    ]);

    // Otra persona no ve nada
    const foreign = await as(http.get('/api/agenda/day/2026-09-26'), other).expect(200);
    expect(foreign.body.tasks).toEqual([]);
  });

  it('migra los antiguos objetivos del día a tareas', async () => {
    const token = await register('h@pulsso.dev');
    const as = (r: request.Test) => r.auth(token, { type: 'bearer' });
    const me = (await as(http.get('/api/auth/me'))).body;
    const conn = app.get<Connection>(getConnectionToken());
    const { Types } = await import('mongoose');
    await conn.collection('day_items').insertMany([
      {
        userId: new Types.ObjectId(me.id),
        date: '2026-09-26',
        list: 'work',
        title: 'Objetivo',
        description: 'Detalle',
        done: true,
        position: 0,
      },
      {
        userId: new Types.ObjectId(me.id),
        date: '2026-09-26',
        list: 'personal',
        title: 'Llamar a mamá',
        description: '',
        done: false,
        position: 0,
      },
    ]);
    const { DayItemsMigration } = await import('../src/day-items/day-items.migration');
    expect(await app.get(DayItemsMigration).run()).toBe(2);
    expect(await conn.collection('day_items').countDocuments()).toBe(0);

    const day = await as(http.get('/api/agenda/day/2026-09-26')).expect(200);
    const cals = (await as(http.get('/api/calendars'))).body as { id: string; name: string }[];
    const byTitle = Object.fromEntries(day.body.tasks.map((t: { title: string }) => [t.title, t]));
    expect(byTitle['Objetivo']).toMatchObject({
      description: 'Detalle',
      done: true,
      recurring: false,
      calendarId: cals.find((c) => c.name === 'Trabajo')!.id,
    });
    expect(byTitle['Llamar a mamá']).toMatchObject({
      done: false,
      calendarId: cals.find((c) => c.name === 'Personal')!.id,
    });
  });

  it('evento especial de día completo, anual', async () => {
    const token = await register('f@pulsso.dev');
    const as = (r: request.Test) => r.auth(token, { type: 'bearer' });
    const cal = (await as(http.get('/api/calendars'))).body[3].id;
    const bday = await as(http.post('/api/events'))
      .send({
        calendarId: cal,
        title: 'Cumpleaños de mamá',
        start: '2026-09-24T15:30',
        end: '2026-09-24T15:30',
        allDay: true,
        rrule: 'FREQ=YEARLY;BYMONTH=9;BYMONTHDAY=24',
        checkable: true,
      })
      .expect(201);
    expect(bday.body).toMatchObject({
      start: '2026-09-24T00:00',
      end: '2026-09-25T00:00',
      allDay: true,
      checkable: false,
    });

    const day = await as(http.get('/api/agenda/day/2027-09-24')).expect(200);
    expect(day.body.events).toEqual([
      expect.objectContaining({ title: 'Cumpleaños de mamá', allDay: true }),
    ]);
    expect(day.body.progress.total).toBe(0);
    const next = await as(http.get('/api/agenda/day/2027-09-25')).expect(200);
    expect(next.body.events).toEqual([]);
  });

  it('categorías: crear, editar, contar uso y borrar', async () => {
    const token = await register('g@pulsso.dev');
    const as = (r: request.Test) => r.auth(token, { type: 'bearer' });
    const created = await as(http.post('/api/calendars'))
      .send({ name: 'Gym', color: 'emerald' })
      .expect(201);
    await as(http.patch(`/api/calendars/${created.body.id}`))
      .send({ name: 'Deporte', color: 'amber' })
      .expect(200);
    await as(http.post('/api/events'))
      .send({
        calendarId: created.body.id,
        title: 'Correr',
        start: '2026-09-26T08:00',
        end: '2026-09-26T09:00',
      })
      .expect(201);
    const usage = await as(http.get(`/api/calendars/${created.body.id}/usage`)).expect(200);
    expect(usage.body).toEqual({ events: 1, tasks: 0 });
    await as(http.delete(`/api/calendars/${created.body.id}`)).expect(204);

    const all = (await as(http.get('/api/calendars'))).body as { id: string }[];
    for (const c of all.slice(1)) await as(http.delete(`/api/calendars/${c.id}`)).expect(204);
    await as(http.delete(`/api/calendars/${all[0].id}`)).expect(400);
  });

  it('eventos de varios días aparecen en cada día', async () => {
    const token = await register('i@pulsso.dev');
    const as = (r: request.Test) => r.auth(token, { type: 'bearer' });
    const cal = (await as(http.get('/api/calendars'))).body[3].id;
    const trip = await as(http.post('/api/events'))
      .send({
        calendarId: cal,
        title: 'Vacaciones',
        start: '2026-09-21T00:00',
        end: '2026-09-25T00:00',
        allDay: true,
      })
      .expect(201);
    expect(trip.body).toMatchObject({ start: '2026-09-21T00:00', end: '2026-09-26T00:00' });
    await as(http.post('/api/events'))
      .send({ calendarId: cal, title: 'Viaje', start: '2026-09-25T18:00', end: '2026-09-27T12:00' })
      .expect(201);

    const week = await as(
      http.get('/api/agenda').query({ from: '2026-09-21', to: '2026-09-28' }),
    ).expect(200);
    const titles = week.body.days.map((d: { events: { title: string }[] }) =>
      d.events.map((e) => e.title),
    );
    expect(titles).toEqual([
      ['Vacaciones'],
      ['Vacaciones'],
      ['Vacaciones'],
      ['Vacaciones'],
      ['Vacaciones', 'Viaje'],
      ['Viaje'],
      ['Viaje'],
      [],
    ]);
    await as(http.post('/api/events'))
      .send({
        calendarId: cal,
        title: 'x',
        start: '2026-09-25T00:00',
        end: '2026-09-21T00:00',
        allDay: true,
      })
      .expect(400);
  });

  it('tareas generales y proyectos con diagrama que se programa en el calendario', async () => {
    const token = await register('p@pulsso.dev');
    const as = (r: request.Test) => r.auth(token, { type: 'bearer' });
    const cal = (await as(http.get('/api/calendars'))).body[0].id;

    const general = await as(http.post('/api/general-tasks'))
      .send({ calendarId: cal, title: 'Renovar pasaporte' })
      .expect(201);
    expect(general.body).toMatchObject({ isProject: false, done: false });
    expect(general.body.nodes).toBeUndefined();
    await as(http.patch(`/api/general-tasks/${general.body.id}`))
      .send({ done: true })
      .expect(200);

    const project = await as(http.post('/api/general-tasks'))
      .send({ calendarId: cal, title: 'Lanzar web', isProject: true })
      .expect(201);
    const pid = project.body.id;
    expect(project.body.nodes.map((n: { type: string }) => n.type)).toEqual([
      'start',
      'activity',
      'end',
    ]);

    const nodes = [
      { id: 'inicio', type: 'start', x: 0, y: 0 },
      { id: 'dis', type: 'activity', title: 'Diseño', x: 0, y: 100, status: 'done' },
      { id: 'dev', type: 'activity', title: 'Desarrollo', x: 0, y: 200, status: 'in_progress' },
      { id: 'ok', type: 'decision', title: '¿Aprobado?', x: 0, y: 300 },
      { id: 'fin', type: 'end', x: 0, y: 400 },
    ];
    const edges = [
      { id: 'e1', source: 'inicio', target: 'dis' },
      { id: 'e2', source: 'dis', target: 'dev' },
      { id: 'e3', source: 'dev', target: 'ok' },
      { id: 'e4', source: 'ok', target: 'fin', label: 'Sí' },
      { id: 'e5', source: 'ok', target: 'dev', label: 'No' },
    ];
    const saved = await as(http.put(`/api/general-tasks/${pid}/diagram`))
      .send({ nodes, edges })
      .expect(200);
    expect(saved.body.progress).toEqual({ done: 1, inProgress: 1, total: 2 });
    await as(http.put(`/api/general-tasks/${pid}/diagram`))
      .send({ nodes, edges: [{ id: 'x', source: 'dis', target: 'nada' }] })
      .expect(400);
    await as(http.put(`/api/general-tasks/${general.body.id}/diagram`))
      .send({ nodes, edges })
      .expect(400);

    // Programar "Desarrollo" como tarea y "Diseño" como evento
    await as(http.post('/api/tasks'))
      .send({
        calendarId: cal,
        title: 'x',
        startDate: '2026-10-01',
        rrule: 'FREQ=DAILY;COUNT=1',
        projectId: pid,
        nodeId: 'ok',
      })
      .expect(400); // una decisión no se programa
    const task = await as(http.post('/api/tasks'))
      .send({
        calendarId: cal,
        title: 'Desarrollo',
        startDate: '2026-10-01',
        rrule: 'FREQ=DAILY;COUNT=1',
        projectId: pid,
        nodeId: 'dev',
      })
      .expect(201);
    expect(task.body).toMatchObject({ projectId: pid, nodeId: 'dev' });
    await as(http.post('/api/events'))
      .send({
        calendarId: cal,
        title: 'Diseño',
        start: '2026-09-30T10:00',
        end: '2026-09-30T12:00',
        projectId: pid,
        nodeId: 'dis',
      })
      .expect(201);

    const day = await as(http.get('/api/agenda/day/2026-10-01')).expect(200);
    expect(day.body.tasks[0].project).toEqual({ id: pid, title: 'Lanzar web' });

    // Tachar la tarea en el calendario marca hecha la actividad
    await as(http.put('/api/completions'))
      .send({ sourceType: 'task', sourceId: task.body.id, date: '2026-10-01', done: true })
      .expect(200);
    const full = await as(http.get(`/api/general-tasks/${pid}`)).expect(200);
    const dev = full.body.nodes.find((n: { id: string }) => n.id === 'dev');
    expect(dev).toMatchObject({
      status: 'done',
      scheduled: { kind: 'task', date: '2026-10-01', done: true },
    });
    expect(full.body.nodes.find((n: { id: string }) => n.id === 'dis').scheduled).toMatchObject({
      kind: 'event',
      start: '2026-09-30T10:00',
    });

    const list = await as(http.get('/api/general-tasks')).expect(200);
    expect(list.body.map((g: { title: string }) => g.title)).toEqual([
      'Lanzar web',
      'Renovar pasaporte',
    ]);
    expect(list.body[0].progress).toEqual({ done: 2, inProgress: 0, total: 2 });

    // Borrar el proyecto deja la tarea en el calendario, sin vínculo
    await as(http.delete(`/api/general-tasks/${pid}`)).expect(204);
    const after = await as(http.get(`/api/tasks/${task.body.id}`)).expect(200);
    expect(after.body.projectId).toBeNull();

    // Otro usuario no la ve
    const other = await register('p2@pulsso.dev');
    await http
      .get(`/api/general-tasks/${general.body.id}`)
      .auth(other, { type: 'bearer' })
      .expect(404);
  });

  it('subtareas: se tachan por día y tachan la tarea cuando están todas', async () => {
    const token = await register('s@pulsso.dev');
    const as = (r: request.Test) => r.auth(token, { type: 'bearer' });
    const cal = (await as(http.get('/api/calendars'))).body[0].id;

    const task = await as(http.post('/api/tasks'))
      .send({
        calendarId: cal,
        title: 'Rutina',
        startDate: '2026-10-01',
        rrule: 'FREQ=DAILY',
        subtasks: [
          { id: 's1', title: 'Estirar' },
          { id: 's2', title: 'Correr' },
        ],
      })
      .expect(201);
    const id = task.body.id;
    const sub = (subtaskId: string, date: string, done: boolean) =>
      as(http.put('/api/completions/subtask')).send({ taskId: id, subtaskId, date, done });

    expect((await sub('s1', '2026-10-01', true).expect(200)).body).toMatchObject({
      subtasksDone: ['s1'],
      done: false,
    });
    expect((await sub('s2', '2026-10-01', true).expect(200)).body.done).toBe(true);
    await sub('nada', '2026-10-01', true).expect(400);
    await sub('s1', '2026-09-30', true).expect(400); // aún no empieza

    const days = await as(
      http.get('/api/agenda').query({ from: '2026-10-01', to: '2026-10-02' }),
    ).expect(200);
    const [d1, d2] = days.body.days.map((d: { tasks: unknown[] }) => d.tasks[0]);
    expect(d1).toMatchObject({
      done: true,
      subtasks: [
        { id: 's1', done: true },
        { id: 's2', done: true },
      ],
    });
    // Otro día empieza de cero
    expect(d2).toMatchObject({ done: false, subtasks: [{ done: false }, { done: false }] });

    // Destachar una subtarea destacha la tarea
    expect((await sub('s2', '2026-10-01', false).expect(200)).body.done).toBe(false);

    // Tachar la tarea tacha todas sus subtareas; destacharla las destacha
    await as(http.put('/api/completions'))
      .send({ sourceType: 'task', sourceId: id, date: '2026-10-02', done: true })
      .expect(200);
    const day2 = await as(http.get('/api/agenda/day/2026-10-02')).expect(200);
    expect(day2.body.tasks[0].subtasks.every((s: { done: boolean }) => s.done)).toBe(true);

    // Agregar una a una tarea ya hecha: ese día cuenta como hecha
    await as(http.patch(`/api/tasks/${id}`))
      .send({
        subtasks: [
          { id: 's1', title: 'Estirar' },
          { id: 's2', title: 'Correr' },
          { id: 's3', title: 'Hidratarse' },
        ],
      })
      .expect(200);
    const again = await as(http.get('/api/agenda/day/2026-10-02')).expect(200);
    expect(again.body.tasks[0]).toMatchObject({
      done: true,
      subtasks: [{ done: true }, { done: true }, { done: true }],
    });

    // Quitar una subtarea la saca también de lo tachado
    await as(http.patch(`/api/tasks/${id}`))
      .send({ subtasks: [{ id: 's2', title: 'Correr 5 km' }] })
      .expect(200);
    const day1 = await as(http.get('/api/agenda/day/2026-10-01')).expect(200);
    expect(day1.body.tasks[0].subtasks).toEqual([{ id: 's2', title: 'Correr 5 km', done: false }]);

    await as(http.patch(`/api/tasks/${id}`))
      .send({
        subtasks: [
          { id: 'x', title: 'a' },
          { id: 'x', title: 'b' },
        ],
      })
      .expect(400);
  });

  it('valida entradas', async () => {
    const token = await register('c@pulsso.dev');
    const cal = (await http.get('/api/calendars').auth(token, { type: 'bearer' })).body[0].id;
    await http
      .post('/api/events')
      .auth(token, { type: 'bearer' })
      .send({ calendarId: cal, title: 'x', start: '2026-09-25T10:00', end: '2026-09-25T09:00' })
      .expect(400);
    await http
      .post('/api/tasks')
      .auth(token, { type: 'bearer' })
      .send({ calendarId: cal, title: 'x', startDate: '2026-09-01', rrule: 'FREQ=HOURLY' })
      .expect(400);
    await http
      .get('/api/agenda')
      .auth(token, { type: 'bearer' })
      .query({ from: '2026-01-01', to: '2026-12-31' })
      .expect(400);
  });
});
