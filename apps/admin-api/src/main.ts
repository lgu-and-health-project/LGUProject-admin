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

  await app.listen(process.env.PORT ?? 4000, '0.0.0.0');
}
bootstrap();
