import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function run() {
  const locs = await prisma.psgcLocations.findMany();
  let count = 0;
  for (const loc of locs) {
    const fixed = loc.areaName.replace(/Ã±/g, 'ñ').replace(/Ã‘/g, 'Ñ');
    if (fixed !== loc.areaName) {
      await prisma.psgcLocations.update({
        where: { psgcLocationId: loc.psgcLocationId },
        data: { areaName: fixed }
      });
      count++;
      console.log('Fixed:', fixed);
    }
  }
  console.log('Total fixed:', count);
}
run();
