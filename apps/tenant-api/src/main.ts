import { NestFactory } from '@nestjs/core';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';
import { createExpressMiddleware } from '@trpc/server/adapters/express';
import { TrpcService } from './trpc/trpc.service';
import { TrpcAppRouter } from './trpc/trpc.router';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.use(cookieParser());
  app.enableCors({
    origin: [
      'http://localhost:5173',
      'http://localhost:3000',
      'http://localhost:3001',
    ],
    credentials: true,
  });

  const trpcService = app.get(TrpcService);
  const trpcAppRouter = app.get(TrpcAppRouter);

  app.use(
    '/trpc',
    createExpressMiddleware({
      router: trpcAppRouter.appRouter,
      createContext: trpcService.createContext,
    }),
  );

  await app.listen(process.env.PORT ?? 4001);
}
bootstrap().catch((err) => {
  console.error('Failed to start application', err);
  process.exit(1);
});
