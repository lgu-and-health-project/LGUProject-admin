import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { PsgcService } from '../src/psgc/psgc.service';
import { PrismaService } from '../src/prisma/prisma.service';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const prisma = app.get(PrismaService);
  console.log('Clearing parents...');
  await prisma.psgcLocations.updateMany({ where: { level: { not: 'region' } }, data: { parentId: null } });
  const psgc = app.get(PsgcService);
  console.log('Running relink...');
  await psgc['linkOrphanedParents']('Q2_2024');
  console.log('Done!');
  await app.close();
}
bootstrap();
