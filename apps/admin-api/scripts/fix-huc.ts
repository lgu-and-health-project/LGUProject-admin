import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function run() {
  const locs = await prisma.psgcLocations.findMany({ where: { cityClassification: { in: ['HUC', 'ICC'] } } });
  let count = 0;
  for (const loc of locs) {
    const naiveParentCode = loc.code.slice(0, 2) + '00000000';
    const parent = await prisma.psgcLocations.findUnique({ where: { code: naiveParentCode } });
    if (parent && loc.parentId !== parent.psgcLocationId) {
      await prisma.psgcLocations.update({
        where: { psgcLocationId: loc.psgcLocationId },
        data: { parentId: parent.psgcLocationId }
      });
      count++;
      console.log('Linked', loc.areaName, 'to', parent.areaName);
    }
  }
  console.log('Total linked:', count);
}
run();
