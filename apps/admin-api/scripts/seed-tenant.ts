import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import { randomUUID } from 'crypto';

const pool = new Pool({ connectionString: process.env.DATABASE_URL || 'postgresql://postgres:admin@localhost:5432/admin_dev' });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const psgcCode = '012801000';
  
  const psgc = await prisma.psgcLocations.upsert({
    where: { code: psgcCode },
    update: {},
    create: {
      code: psgcCode,
      psgcVersion: '2023',
      areaName: 'Test LGU',
      level: 'MUNICIPALITY'
    }
  });

  const tenant = await prisma.lguTenants.upsert({
    where: { psgcLocationId: psgc.psgcLocationId },
    update: {},
    create: {
      psgcLocationId: psgc.psgcLocationId,
      sysadminEmail: 'test@example.com',
      status: 'active'
    }
  });

  const regKey = `rk_${randomUUID()}`;
  
  const license = await prisma.licenses.create({
    data: {
      tenantId: tenant.tenantId,
      registrationKey: regKey,
      status: 'active',
      issuedAt: new Date()
    }
  });

  console.log(`[SEED] Created Tenant: ${tenant.tenantId}`);
  console.log(`[SEED] License Registration Key: ${regKey}`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
