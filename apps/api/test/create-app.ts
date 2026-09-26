import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';

/** Levanta la app igual que main.ts. Las variables se fijan antes de importar AppModule. */
export async function createApp(env: Record<string, string>): Promise<INestApplication> {
  Object.assign(process.env, { JWT_SECRET: 'x'.repeat(48) }, env);
  const { AppModule } = await import('../src/app.module');
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
  const app = moduleRef.createNestApplication();
  app.setGlobalPrefix('api');
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
  await app.init();
  return app;
}
