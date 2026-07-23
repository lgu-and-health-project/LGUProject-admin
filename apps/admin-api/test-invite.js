const crypto = require('crypto');
const { PrismaClient } = require('./node_modules/@prisma/client');
const prisma = new PrismaClient();

async function run() {
  const inviteToken = crypto.randomBytes(32).toString('hex');
  const inviteTokenHash = crypto.createHash('sha256').update(inviteToken).digest('hex');
  const inviteExpiresAt = new Date();
  inviteExpiresAt.setDate(inviteExpiresAt.getDate() + 7);

  const newAdmin = await prisma.superAdmin.create({
    data: {
      email: 'test' + Date.now() + '@example.com',
      fullName: 'Test Admin',
      role: 'ADMIN',
      status: 'invited',
      passwordHash: 'dummy',
      inviteTokenHash,
      inviteExpiresAt
    }
  });
  console.log('Created admin:', newAdmin.id, 'Token:', inviteToken);

  const hashToSearch = crypto.createHash('sha256').update(inviteToken).digest('hex');
  const foundAdmin = await prisma.superAdmin.findFirst({ where: { inviteTokenHash: hashToSearch } });
  
  if (foundAdmin) {
    console.log('SUCCESS: Admin found with hash:', hashToSearch);
  } else {
    console.log('FAIL: Admin not found for hash:', hashToSearch);
  }
}

run().catch(console.error).finally(() => prisma.$disconnect());
