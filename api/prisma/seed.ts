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

  const documentTypes = [
    { code: 'memo' as const, name: 'Memorandum', description: 'Internal memos and brief communications between offices.' },
    { code: 'letter' as const, name: 'Letter', description: 'Formal letters to external parties or other agencies.' },
    { code: 'ordinance' as const, name: 'Ordinance', description: 'Local ordinances enacted by the city council.' },
    { code: 'resolution' as const, name: 'Resolution', description: 'Formal expressions of the council or governing body.' },
    { code: 'report' as const, name: 'Report', description: 'Activity, accomplishment, and status reports.' },
    { code: 'contract' as const, name: 'Contract', description: 'Contracts, MOUs, and other binding agreements.' },
    { code: 'circular' as const, name: 'Circular', description: 'Circulars and advisories for general circulation.' },
    { code: 'others' as const, name: 'Others', description: 'Other document types that do not fit the standard categories.' },
  ];

  for (const type of documentTypes) {
    await prisma.documentType.upsert({
      where: { code: type.code },
      update: {
        name: type.name,
        description: type.description,
        isActive: true,
      },
      create: {
        ...type,
        isActive: true,
      },
    });
  }

  console.log('Seed complete.');
  console.log(`  Office: ${office.code} (${office.id})`);
  console.log(`  Employee: EMP-0001 <${office.code}>`);
  console.log(`  Document types: ${documentTypes.length}`);
}

main()
  .catch((err) => {
    console.error('Seed failed:', err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
