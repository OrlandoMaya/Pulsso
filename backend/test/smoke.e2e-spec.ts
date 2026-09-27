import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createApp } from './create-app';

/** Sin base de datos: verifica el cableado de módulos, los guards y la validación. */
describe('Pulsso API (smoke, sin Mongo)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    // Puerto cerrado: Mongoose no llega a conectarse en estas rutas
    process.env.MONGOOSE_LAZY = '1';
    app = await createApp({ MONGODB_URI: 'mongodb://127.0.0.1:1/pulsso-smoke' });
  });

  afterAll(async () => {
    await app?.close();
  });

  it('health es público', () =>
    request(app.getHttpServer()).get('/api/health').expect(200, { status: 'ok' }));

  it.each([
    ['get', '/api/calendars'],
    ['get', '/api/tasks'],
    ['get', '/api/agenda?from=2026-09-21&to=2026-09-27'],
    ['get', '/api/agenda/day/2026-09-26'],
    ['put', '/api/completions'],
    ['post', '/api/events'],
    ['get', '/api/auth/me'],
    ['get', '/api/day-items?date=2026-09-26&list=work'],
    ['post', '/api/day-items'],
  ] as const)('%s %s exige sesión', (method, url) =>
    request(app.getHttpServer())[method](url).expect(401),
  );

  it('un token falso no sirve', () =>
    request(app.getHttpServer())
      .get('/api/calendars')
      .auth('abc.def.ghi', { type: 'bearer' })
      .expect(401));

  it('valida el registro antes de tocar la base', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({ name: 'Ana', email: 'no-es-correo', password: '123' })
      .expect(400);
    expect(res.body.message).toEqual(
      expect.arrayContaining([
        'email must be an email',
        'La contraseña debe tener al menos 8 caracteres',
      ]),
    );
  });

  it('rechaza campos extra', () =>
    request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: 'a@b.co', password: 'x', admin: true })
      .expect(400));
});
