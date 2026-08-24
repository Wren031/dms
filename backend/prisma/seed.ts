import { PrismaClient, Role, AccountStatus } from '@prisma/client';
import { hashPassword } from '../src/common/utils/hash.util';

const prisma = new PrismaClient();

const ADMIN_EMAIL = process.env.SEED_ADMIN_EMAIL ?? 'juan.delacruz@example.com';
const ADMIN_USERNAME = process.env.SEED_ADMIN_USERNAME ?? 'admin';
const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD ?? 'Admin@123';
const ADMIN_EMPLOYEE_NO = process.env.SEED_ADMIN_EMPLOYEE_NO ?? 'EMP-0001';
const ADMIN_OFFICE_CODE = process.env.SEED_ADMIN_OFFICE_CODE ?? 'MAIN';

async function main(): Promise<void> {
  const office = await prisma.office.upsert({
    where: { code: ADMIN_OFFICE_CODE },
    update: {},
    create: {
      name: 'Main Office',
      code: ADMIN_OFFICE_CODE,
      type: 'main',
      isActive: true,
    },
  });

  const employee = await prisma.employee.upsert({
    where: { employeeNo: ADMIN_EMPLOYEE_NO },
    update: {
      email: ADMIN_EMAIL,
    },
    create: {
      employeeNo: ADMIN_EMPLOYEE_NO,
      firstName: 'Juan',
      lastName: 'Dela Cruz',
      position: 'Records Officer',
      email: ADMIN_EMAIL,
      officeId: office.id,
      isActive: true,
    },
  });

  const passwordHash = await hashPassword(ADMIN_PASSWORD);

  const admin = await prisma.user.upsert({
    where: { email: ADMIN_EMAIL },
    update: {
      username: ADMIN_USERNAME,
      passwordHash,
      role: Role.SYSTEM_ADMIN,
      status: AccountStatus.ACTIVE,
      employeeId: employee.id,
    },
    create: {
      username: ADMIN_USERNAME,
      email: ADMIN_EMAIL,
      passwordHash,
      role: Role.SYSTEM_ADMIN,
      status: AccountStatus.ACTIVE,
      employeeId: employee.id,
    },
    select: {
      id: true,
      email: true,
      username: true,
      role: true,
      status: true,
      employeeId: true,
    },
  });

  console.log('Seed complete.');
  console.log(`  Office:   ${office.code} (${office.id})`);
  console.log(`  Employee: ${employee.employeeNo} (${employee.id})`);
  console.log(`  Admin:    ${admin.email} [${admin.role}] (${admin.id})`);
  console.log('');
  console.log('  Login credentials:');
  console.log(`    email/username : ${ADMIN_EMAIL}  /  ${ADMIN_USERNAME}`);
  console.log(`    password       : ${ADMIN_PASSWORD}`);
  console.log('  (override via SEED_ADMIN_EMAIL / SEED_ADMIN_USERNAME / SEED_ADMIN_PASSWORD)');
}

main()
  .catch((err) => {
    console.error('Seed failed:', err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
