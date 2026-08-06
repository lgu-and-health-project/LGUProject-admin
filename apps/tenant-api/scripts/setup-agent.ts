import { PrismaClient } from '@prisma/client-tenant';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

const pool = new Pool({ connectionString: process.env.DATABASE_URL || 'postgresql://postgres:admin@localhost:5432/lgu_tenant_dev' });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const regKeyArg = process.argv.find(a => a.startsWith('--key='));
  const deviceIdArg = process.argv.find(a => a.startsWith('--device='));

  if (!regKeyArg || !deviceIdArg) {
    throw new Error('Missing --key=<registrationKey> or --device=<deviceId>');
  }

  const regKey = regKeyArg.split('=')[1];
  const deviceId = deviceIdArg.split('=')[1];

  await prisma.systemConfig.upsert({
    where: { key: 'DEVICE_ID' },
    update: { value: deviceId },
    create: { key: 'DEVICE_ID', value: deviceId }
  });

  await prisma.systemConfig.upsert({
    where: { key: 'DEVICE_REGISTRATION_KEY' },
    update: { value: regKey },
    create: { key: 'DEVICE_REGISTRATION_KEY', value: regKey }
  });

  console.log(`[SETUP] Agent configured successfully. Restart tenant-api to connect to central.`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
