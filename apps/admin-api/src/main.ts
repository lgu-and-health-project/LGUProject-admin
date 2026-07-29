import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { createExpressMiddleware } from '@trpc/server/adapters/express';
import { AppModule } from './app.module';
import { TrpcService } from './trpc/trpc.service';
import { TrpcAppRouter } from './trpc/trpc.router';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import compression from 'compression';
import * as dns from 'dns';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';

dns.setDefaultResultOrder('ipv4first');

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.use(cookieParser());

  app.use(
    helmet({
      contentSecurityPolicy:
        process.env.NODE_ENV === 'production' ? undefined : false,
      crossOriginEmbedderPolicy:
        process.env.NODE_ENV === 'production' ? undefined : false,
    }),
  );

  app.use(compression());

  // ValidationPipe still applies to REST controllers (auth, internal).
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const allowedOrigins =
    process.env.NODE_ENV === 'production'
      ? [process.env.FRONTEND_URL as string]
      : [
          process.env.FRONTEND_URL || 'http://localhost:3000',
          'http://192.168.100.28:3000',
        ];

  app.enableCors({
    origin: allowedOrigins,
    credentials: true,
  });

  // Mount tRPC on /trpc. Auth, internal, and health routes stay REST.
  const trpcService = app.get(TrpcService);
  const trpcAppRouter = app.get(TrpcAppRouter);
  app.use(
    '/trpc',
    createExpressMiddleware({
      router: trpcAppRouter.appRouter,
      createContext: trpcService.createContext,
    }),
  );

  const config = new DocumentBuilder()
    .setTitle('LGU Platform Admin API')
    .setDescription('Central API for Superadmins, Tenants, and Citizens')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  await app.listen(process.env.PORT ?? 4000, '0.0.0.0');
}
void bootstrap();
