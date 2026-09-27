import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { MongooseModule } from '@nestjs/mongoose';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { AgendaModule } from './agenda/agenda.module';
import { AuthModule } from './auth/auth.module';
import { JwtAuthGuard } from './auth/jwt-auth.guard';
import { CalendarsModule } from './calendars/calendars.module';
import { CompletionsModule } from './completions/completions.module';
import { DayItemsModule } from './day-items/day-items.module';
import { validateEnv } from './config/env.validation';
import { EventsModule } from './events/events.module';
import { GeneralTasksModule } from './general-tasks/general-tasks.module';
import { HealthController } from './health/health.controller';
import { TasksModule } from './tasks/tasks.module';
import { UsersModule } from './users/users.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate: validateEnv }),
    MongooseModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        uri: config.getOrThrow<string>('MONGODB_URI'),
        // Solo para la prueba de humo sin base de datos
        lazyConnection: config.get('MONGOOSE_LAZY') === '1',
      }),
    }),
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 120 }]),
    UsersModule,
    AuthModule,
    CalendarsModule,
    EventsModule,
    TasksModule,
    CompletionsModule,
    AgendaModule,
    GeneralTasksModule,
    DayItemsModule,
  ],
  controllers: [HealthController],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    // Todo requiere sesión salvo lo marcado con @Public()
    { provide: APP_GUARD, useClass: JwtAuthGuard },
  ],
})
export class AppModule {}
