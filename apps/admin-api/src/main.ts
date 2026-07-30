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
  
  // 2. Enable CORS with a robust dynamic origin checker
  app.enableCors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like server-to-server or curl)
      if (!origin) return callback(null, true);
      
      const configuredFrontend = process.env.FRONTEND_URL?.trim().replace(/\/$/, '');
      const allowedOrigins = [
        configuredFrontend,
        'http://localhost:3000',
        'http://192.168.100.28:3000'
      ].filter(Boolean);

      // Automatically allow ANY Vercel preview branches for easy testing,
      // or exact matches for the configured FRONTEND_URL
      if (origin.endsWith('.vercel.app') || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(null, false);
      }
    },
    credentials: true, // This is REQUIRED for the browser to accept HttpOnly cookies from the backend
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

  if (process.env.NODE_ENV !== 'production') {
    const config = new DocumentBuilder()
      .setTitle('LGU Platform Admin API')
      .setDescription('Central API for Superadmins, Tenants, and Citizens')
      .setVersion('1.0')
      .addBearerAuth()
      .build();
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document);
  }

  await app.listen(process.env.PORT ?? 4000, '0.0.0.0');
}
void bootstrap();
