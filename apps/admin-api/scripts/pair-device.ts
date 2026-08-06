import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

const pool = new Pool({ connectionString: process.env.DATABASE_URL || 'postgresql://postgres:admin@localhost:5432/admin_dev' });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const regKeyArg = process.argv.find(a => a.startsWith('--key='));
  if (!regKeyArg) throw new Error('Missing --key=<registrationKey>');
  const regKey = regKeyArg.split('=')[1];

  const license = await prisma.licenses.findUnique({
    where: { registrationKey: regKey }
  });

  if (!license || license.status !== 'active') {
    throw new Error('Invalid or inactive registration key');
  }

  let deviceId = license.deviceId;

  if (!deviceId) {
    const device = await prisma.devices.create({
      data: {
        tenantId: license.tenantId,
        status: 'ACTIVE'
      }
    });
    deviceId = device.deviceId;
    
    await prisma.licenses.update({
      where: { licenseId: license.licenseId },
      data: { deviceId }
    });
    console.log(`[PAIR] Created new device: ${deviceId}`);
  } else {
    console.log(`[PAIR] Existing device found: ${deviceId}`);
  }

  console.log(`\nRun this on tenant-api:`);
  console.log(`npx ts-node scripts/setup-agent.ts --key=${regKey} --device=${deviceId}\n`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
