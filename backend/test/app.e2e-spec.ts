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
    expect(gym.body).toMatchObject({ start: '2026-09-01T07:30', checkable: true });
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
    expect(day.body.progress).toEqual({ done: 0, total: 2 });

    // Tachar
    await asA(http.put('/api/completions'))
      .send({ sourceType: 'task', sourceId: task.body.id, date: '2026-09-25', done: true })
      .expect(200);
    await asA(http.put('/api/completions'))
      .send({ sourceType: 'event', sourceId: gym.body.id, date: '2026-09-25', done: true })
      .expect(200);
    const after = await asA(http.get('/api/agenda/day/2026-09-25')).expect(200);
    expect(after.body.progress).toEqual({ done: 2, total: 2 });
    expect(after.body.tasks[0].done).toBe(true);

    // Otro día no queda tachado
    const other = await asA(http.get('/api/agenda/day/2026-09-23')).expect(200);
    expect(other.body.progress).toEqual({ done: 0, total: 2 });

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
