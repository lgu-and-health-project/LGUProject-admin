import { PrismaClient } from '@prisma/client-tenant';
const prisma = new PrismaClient();

async function main() {
  const users = await prisma.staffUser.findMany({
    select: { email: true, orgCode: true, credentials: { select: { passwordHash: true } } }
  });
  console.log(JSON.stringify(users, null, 2));
}
main().catch(console.error).finally(() => prisma.$disconnect());
