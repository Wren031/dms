// import { PrismaClient } from '@prisma/client';

// const prisma = new PrismaClient();

// async function main(): Promise<void> {
  
//   const office = await prisma.office.upsert({
//     where: { code: 'MAIN' },
//     update: {},
//     create: {
//       name: 'Main Office',
//       code: 'MAIN',
//       type: 'main',
//       isActive: true,
//     },
//   });

//   await prisma.employee.upsert({
//     where: { employeeNo: 'EMP-0001' },
//     update: {},
//     create: {
//       employeeNo: 'EMP-0001',
//       firstName: 'Juan',
//       lastName: 'Dela Cruz',
//       position: 'Records Officer',
//       email: 'juan.delacruz@example.com',
//       officeId: office.id,
//       isActive: true,
//     },
//   });

//   const documentTypes = [
//     { name: 'Memorandum', description: 'Internal memos and brief communications between offices.', codes: ['memo' as const] },
//     { name: 'Letter', description: 'Formal letters to external parties or other agencies.', codes: ['letter' as const] },
//     { name: 'Ordinance', description: 'Local ordinances enacted by the city council.', codes: ['ordinance' as const] },
//     { name: 'Resolution', description: 'Formal expressions of the council or governing body.', codes: ['resolution' as const] },
//     { name: 'Report', description: 'Activity, accomplishment, and status reports.', codes: ['report' as const] },
//     { name: 'Contract', description: 'Contracts, MOUs, and other binding agreements.', codes: ['contract' as const] },
//     { name: 'Circular', description: 'Circulars and advisories for general circulation.', codes: ['circular' as const] },
//     { name: 'Others', description: 'Other document types that do not fit the standard categories.', codes: ['others' as const] },
//   ];

//   for (const type of documentTypes) {
//     const existing = await prisma.documentType.findFirst({ where: { name: type.name } });
//     if (existing) {
//       await prisma.documentType.update({
//         where: { id: existing.id },
//         data: { description: type.description, isActive: true },
//       });
//     } else {
//       await prisma.documentType.create({
//         data: {
//           name: type.name,
//           description: type.description,
//           isActive: true,
//           codes: { create: type.codes.map(code => ({ code })) },
//         },
//       });
//     }
//   }

//   console.log('Seed complete.');
//   console.log(`  Office: ${office.code} (${office.id})`);
//   console.log(`  Employee: EMP-0001 <${office.code}>`);
//   console.log(`  Document types: ${documentTypes.length}`);
// }

// main()
//   .catch((err) => {
//     console.error('Seed failed:', err);
//     process.exitCode = 1;
//   })
//   .finally(async () => {
//     await prisma.$disconnect();
//   });
