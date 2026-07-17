const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
prisma.superAdmin.findMany().then(console.log).finally(() => prisma.$disconnect());
