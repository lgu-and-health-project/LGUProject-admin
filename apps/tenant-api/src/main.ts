import { NestFactory } from '@nestjs/core';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';

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

  await app.listen(process.env.PORT ?? 4001);
}
bootstrap().catch((err) => {
  console.error('Failed to start application', err);
  process.exit(1);
});
