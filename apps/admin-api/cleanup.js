require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function clean() {
  const tenants = await prisma.lguTenant.findMany({ select: { code: true } });
  const codes = tenants.map(t => t.code);
  const deleted = await prisma.onboardingRequest.deleteMany({
    where: { orgCode: { notIn: codes } }
  });
  console.log('Deleted orphaned onboarding requests:', deleted.count);
}

clean()
  .catch(e => console.error(e))
  .finally(() => {
    prisma.$disconnect();
    pool.end();
  });
