import 'dotenv/config';
import { PrismaClient } from '../generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

const orgs = [
  { code: 'taytay', name: 'Municipality of Taytay', level: 'municipality' },
  { code: 'sanjuan', name: 'City of San Juan', level: 'city' },
  { code: 'bauan', name: 'Municipality of Bauan', level: 'municipality' },
];

async function main() {
  // Shared service catalog — not tenant-scoped
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

  for (const org of orgs) {
    await prisma.organization.create({
      data: {
        code: org.code,
        name: org.name,
        level: org.level,
        emailDomain: `${org.code}.gov.ph`,
      },
    });

    const dept = await prisma.department.create({
      data: {
        orgCode: org.code,
        name: 'Office of the Mayor',
        category: 'mandatory',
      },
    });

    const staff = await prisma.staffUser.create({
      data: {
        orgCode: org.code,
        email: `admin@${org.code}.gov.ph`,
        passwordHash: await bcrypt.hash('TestPassword123', 10),
        authProvider: 'password',
        status: 'active',
        baseRole: 'staff',
        departmentId: dept.id,
      },
    });

    await prisma.employee.create({
      data: {
        staffUserId: staff.id,
        position: 'Administrative Officer',
        dateHired: new Date('2023-01-15'),
      },
    });

    await prisma.permissionGrant.create({
      data: {
        staffUserId: staff.id,
        permission: 'manage_hr',
        scopeType: 'department',
        scopeId: dept.id,
      },
    });

    await prisma.staffInvite.create({
      data: {
        orgCode: org.code,
        email: `clerk@${org.code}.gov.ph`,
        invitedById: staff.id,
        status: 'pending',
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      },
    });

    const citizen = await prisma.citizenUser.create({
      data: {
        orgCode: org.code,
        email: `citizen@${org.code}-example.com`,
        passwordHash: await bcrypt.hash('CitizenPass123', 10),
        fullName: `Juan Dela Cruz (${org.name})`,
        verificationLevel: 'unverified',
      },
    });

    await prisma.applicationCase.create({
      data: {
        orgCode: org.code,
        citizenId: citizen.id,
        serviceTypeCode: 'brgy_clearance',
        status: 'submitted',
        assignedDepartmentId: dept.id,
      },
    });
  }

  console.log(
    'Seed complete: 3 orgs, each with department, staff, employee, permission grant, invite, citizen, and one application.',
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
