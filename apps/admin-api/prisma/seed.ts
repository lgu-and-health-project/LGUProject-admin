import 'dotenv/config';
import { PrismaClient, AdminRole, AdminStatus } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import * as bcrypt from 'bcryptjs';

const connectionString = process.env.DATABASE_URL;
const isRemote =
  connectionString?.includes('render.com') ||
  connectionString?.includes('supabase');

const pool = new Pool({
  connectionString,
  ...(isRemote && { ssl: { rejectUnauthorized: false } }),
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('Seeding initial SuperAdmin...');

  const adminEmail = process.env.INITIAL_SUPERADMIN_EMAIL;
  const adminPassword = process.env.INITIAL_SUPERADMIN_PASSWORD;

  if (!adminEmail || !adminPassword) {
    console.warn(
      'Warning: INITIAL_SUPERADMIN_EMAIL or INITIAL_SUPERADMIN_PASSWORD is not set in .env. Skipping SuperAdmin seeding.',
    );
    return;
  }

  if (process.env.NODE_ENV !== 'production') {
    console.log('Wiping all existing data for a clean slate...');
    await prisma.superAdminAuditLogs.deleteMany();
    await prisma.refreshTokens.deleteMany();
    await prisma.licenses.deleteMany();
    await prisma.lguTenants.deleteMany();
    await prisma.superAdmins.deleteMany();
  } else {
    console.log('Production environment detected. Skipping database wipe.');
  }

  const passwordHash = await bcrypt.hash(adminPassword, 10);

  const superAdmin = await prisma.superAdmins.upsert({
    where: { email: adminEmail },
    update: {
      passwordHash,
      fullName: 'Root Superadmin',
      role: AdminRole.ROOT_SUPERADMIN,
      status: AdminStatus.ACTIVE,
    },
    create: {
      email: adminEmail,
      passwordHash,
      fullName: 'Root Superadmin',
      role: AdminRole.ROOT_SUPERADMIN,
      status: AdminStatus.ACTIVE,
    },
  });

  console.log(`SuperAdmin seeded successfully: ${superAdmin.email}`);
}

main()
  .catch((e) => {
    console.error('Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
