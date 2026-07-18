import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import cookieParser from 'cookie-parser';
import * as dns from 'dns';

// Force Node.js to use IPv4 over IPv6. Node 17+ prefers IPv6, which breaks Render's SMTP networking.
dns.setDefaultResultOrder('ipv4first');

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // 1. Enable Cookie Parsing
  app.use(cookieParser());
  
  // 2. Enable CORS specifically for the frontend
  const allowedOrigins = process.env.NODE_ENV === 'production' 
    ? [process.env.FRONTEND_URL as string] 
    : [process.env.FRONTEND_URL || 'http://localhost:3000', 'http://192.168.100.28:3000'];

  app.enableCors({
    origin: allowedOrigins,
    credentials: true, // This is REQUIRED for the browser to accept HttpOnly cookies from the backend
  });

  await app.listen(process.env.PORT ?? 4000, '0.0.0.0');
}
bootstrap();
