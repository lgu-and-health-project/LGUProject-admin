import 'dotenv/config';
import { PrismaClient } from '@prisma/client-tenant';
import { PrismaPg } from '@prisma/adapter-pg';


const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});



async function main() {
  await prisma.serviceType.createMany({
    data: [
      {
        code: 'brgy_clearance',
        name: 'Barangay Clearance',
        category: 'barangay',
        requiresVerification: false,
      },
      {
        code: 'business_permit',
        name: 'Business Permit',
        category: 'municipal',
        requiresVerification: true,
      },
    ],
  });

  console.log(
    'Seed complete: ServiceTypes seeded.',
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
