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
      'http://localhost:4002',
      'http://127.0.0.1:4002',
    ],
    credentials: true,
  });

  const trpcService = app.get(TrpcService);
  const trpcAppRouter = app.get(TrpcAppRouter);

  // Check for pairing token in CLI args
  const pairArg = process.argv.find((arg) => arg.startsWith('--pair='));
  if (pairArg) {
    const token = pairArg.split('=')[1];
    if (token && token.length === 6) {
      const adminApiService = app.get(
        require('./modules/admin-api/admin-api.service').AdminApiService,
      );
      console.log(`Pairing device via CLI using token: ${token}`);
      await adminApiService.pairDeviceAndSave(token);
      return; // The service calls process.exit(0)
    }
  }

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
