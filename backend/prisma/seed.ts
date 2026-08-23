import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main(): Promise<void> {
  const office = await prisma.office.upsert({
    where: { code: 'MAIN' },
    update: {},
    create: {
      name: 'Main Office',
      code: 'MAIN',
      type: 'main',
      isActive: true,
    },
  });

  await prisma.employee.upsert({
    where: { employeeNo: 'EMP-0001' },
    update: {},
    create: {
      employeeNo: 'EMP-0001',
      firstName: 'Juan',
      lastName: 'Dela Cruz',
      position: 'Records Officer',
      email: 'juan.delacruz@example.com',
      officeId: office.id,
      isActive: true,
    },
  });

  console.log('Seed complete.');
  console.log(`  Office: ${office.code} (${office.id})`);
  console.log(`  Employee: EMP-0001 <${office.code}>`);
}

main()
  .catch((err) => {
    console.error('Seed failed:', err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
