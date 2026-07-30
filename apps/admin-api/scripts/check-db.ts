import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function run() {
  const regions = await prisma.psgcLocations.count({ where: { level: 'region' } });
  const provinces = await prisma.psgcLocations.count({ where: { level: 'province' } });
  const cities = await prisma.psgcLocations.count({ where: { level: 'city' } });
  const municipalities = await prisma.psgcLocations.count({ where: { level: 'municipality' } });
  const barangays = await prisma.psgcLocations.count({ where: { level: 'barangay' } });
  console.log({ regions, provinces, cities, municipalities, barangays });

  const iloilo = await prisma.psgcLocations.findMany({ where: { areaName: { contains: 'Iloilo' } } });
  console.log('Iloilo matching records:');
  iloilo.forEach(i => console.log(i.areaName, i.level, i.cityClassification));
}
run();
