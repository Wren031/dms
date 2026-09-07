/**
 * End-to-end verification for /document-attachments/:id/download
 *
 * Confirms that:
 *   1. GET .../download                   -> Content-Disposition: attachment
 *   2. GET .../download?inline=1          -> Content-Disposition: inline
 *   3. GET .../download?inline=true       -> Content-Disposition: inline
 *   4. GET .../download for a missing file -> 404
 *
 * Steps:
 *   a. Connect to Prisma.
 *   b. Find or create a System Admin user with a known password (sets hash directly).
 *   c. Find or create a Document owned by that admin's office.
 *   d. Find or create a DocumentAttachment with a real on-disk file.
 *   e. Login via HTTP and capture cookies.
 *   f. HEAD both URLs and print + assert Content-Disposition.
 *   g. Delete the on-disk file to simulate "file missing" and HEAD again -> 404.
 *
 * Usage:  node verify-disposition.js
 */
const http = require('http');
const fs = require('fs');
const path = require('path');
const argon2 = require('argon2');
const { PrismaClient } = require('@prisma/client');

const HOST = '127.0.0.1';
const PORT = 3000;
const ADMIN_USERNAME = 'admin';
const ADMIN_EMAIL = 'admin@city.gov';
const ADMIN_PASSWORD = 'TestPass@1234'; // ephemeral; reset only for this script run
const OFFICE_CODE = 'OCM';

function req(method, urlPath, { headers = {}, body } = {}) {
  return new Promise((resolve, reject) => {
    const data = body ? (typeof body === 'string' ? body : JSON.stringify(body)) : null;
    const r = http.request(
      {
        host: HOST,
        port: PORT,
        path: urlPath,
        method,
        headers: {
          ...(data ? { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) } : {}),
          ...headers,
        },
      },
      res => {
        let buf = '';
        res.on('data', c => (buf += c));
        res.on('end', () => {
          const setCookie = res.headers['set-cookie'] || [];
          resolve({ status: res.statusCode, headers: res.headers, body: buf, setCookie });
        });
      },
    );
    r.on('error', reject);
    if (data) r.write(data);
    r.end();
  });
}

function cookieHeaderFrom(setCookie) {
  return setCookie.map(c => c.split(';')[0]).join('; ');
}

function assertEqual(actual, expected, label) {
  const ok = actual === expected;
  console.log(`  ${ok ? '\u2714' : '\u2718'} ${label}: ${JSON.stringify(actual)} ${ok ? '' : `(expected ${JSON.stringify(expected)})`}`);
  if (!ok) process.exitCode = 1;
}

async function main() {
  const prisma = new PrismaClient();
  try {
    // -- 1. Find or create office --
    let office = await prisma.office.findUnique({ where: { code: OFFICE_CODE } });
    if (!office) {
      office = await prisma.office.create({
        data: { code: OFFICE_CODE, name: 'Office of the City Mayor', type: 'main', isActive: true },
      });
    }
    console.log(`Office: ${office.code} (${office.id})`);

    // -- 2. Find or create admin employee --
    let employee = await prisma.employee.findFirst({ where: { email: ADMIN_EMAIL } });
    if (!employee) {
      employee = await prisma.employee.create({
        data: {
          employeeNo: 'EMP-VERIFY-001',
          firstName: 'Verify',
          lastName: 'Admin',
          position: 'Test Admin',
          email: ADMIN_EMAIL,
          officeId: office.id,
          isActive: true,
        },
      });
    } else {
      employee = await prisma.employee.update({
        where: { id: employee.id },
        data: { officeId: office.id, isActive: true },
      });
    }
    console.log(`Employee: ${employee.email} (${employee.id})`);

    // -- 3. Find or create admin user with known password --
    const passwordHash = await argon2.hash(ADMIN_PASSWORD, {
      type: argon2.argon2id,
      memoryCost: 19_456,
      timeCost: 2,
      parallelism: 1,
    });
    const user = await prisma.user.upsert({
      where: { username: ADMIN_USERNAME },
      update: { passwordHash, role: 'SYSTEM_ADMIN', status: 'ACTIVE', employeeId: employee.id },
      create: {
        username: ADMIN_USERNAME,
        email: ADMIN_EMAIL,
        passwordHash,
        role: 'SYSTEM_ADMIN',
        status: 'ACTIVE',
        employeeId: employee.id,
      },
    });
    console.log(`User: ${user.username} (${user.id})`);

    // -- 4. Find or create a document --
    let document = await prisma.document.findFirst({
      where: { encodedById: user.id },
      orderBy: { createdAt: 'desc' },
    });
    if (!document) {
      const type = await prisma.documentType.findFirst();
      if (!type) throw new Error('No document type found — run npm run seed first.');
      document = await prisma.document.create({
        data: {
          trackingNumber: `DMS-VERIFY-${Date.now()}`,
          documentNumber: 'VERIFY-001',
          title: 'Disposition Verify',
          typeId: type.id,
          classification: 'internal',
          status: 'registered',
          priority: 'normal',
          source: 'internal',
          currentOfficeId: office.id,
          encodedById: user.id,
        },
      });
    }
    console.log(`Document: ${document.trackingNumber} (${document.id})`);

    // -- 5. Find or create an attachment with a real file on disk --
    let attachment = await prisma.documentAttachment.findFirst({
      where: { documentId: document.id, status: 'uploaded' },
      orderBy: { createdAt: 'desc' },
    });

    const uploadsRoot = path.resolve(__dirname, 'uploads');
    fs.mkdirSync(uploadsRoot, { recursive: true });

    if (!attachment) {
      // Mimic the storage layout the LocalStorageService uses.
      const relPath = `verify-${Date.now()}.txt`;
      const absPath = path.join(uploadsRoot, relPath);
      fs.writeFileSync(absPath, 'verify\n', 'utf8');
      attachment = await prisma.documentAttachment.create({
        data: {
          documentId: document.id,
          fileName: 'verify.txt',
          mimeType: 'text/plain',
          sizeBytes: fs.statSync(absPath).size,
          storageKey: relPath,
          status: 'uploaded',
          uploadedById: user.id,
        },
      });
      console.log(`Attachment created: ${attachment.fileName} (${attachment.id})`);
    } else {
      console.log(`Attachment reused: ${attachment.fileName} (${attachment.id})`);
    }

    // -- 6. Login --
    const loginRes = await req('POST', '/auth/login', {
      body: { emailOrUsername: ADMIN_USERNAME, password: ADMIN_PASSWORD },
    });
    if (loginRes.status !== 201 && loginRes.status !== 200) {
      throw new Error(`Login failed: ${loginRes.status} ${loginRes.body}`);
    }
    const cookie = cookieHeaderFrom(loginRes.setCookie);
    if (!cookie) throw new Error('No auth cookies returned from login');
    console.log('Login OK.');

    const authHeaders = { Cookie: cookie };

    // -- 7. Verify Content-Disposition variants --
    console.log('\nAttachment URL:', `/document-attachments/${attachment.id}/download`);

    const r1 = await req('HEAD', `/document-attachments/${attachment.id}/download`, { headers: authHeaders });
    console.log(`\nGET .../download:`);
    console.log(`  status: ${r1.status}`);
    console.log(`  content-disposition: ${r1.headers['content-disposition']}`);
    assertEqual(r1.status, 200, 'status code without inline');
    assertEqual(
      (r1.headers['content-disposition'] || '').startsWith('attachment'),
      true,
      'disposition starts with "attachment"',
    );

    const r2 = await req('HEAD', `/document-attachments/${attachment.id}/download?inline=1`, { headers: authHeaders });
    console.log(`\nGET .../download?inline=1:`);
    console.log(`  status: ${r2.status}`);
    console.log(`  content-disposition: ${r2.headers['content-disposition']}`);
    assertEqual(r2.status, 200, 'status code with inline=1');
    assertEqual(
      (r2.headers['content-disposition'] || '').startsWith('inline'),
      true,
      'disposition starts with "inline"',
    );

    const r3 = await req('HEAD', `/document-attachments/${attachment.id}/download?inline=true`, { headers: authHeaders });
    console.log(`\nGET .../download?inline=true:`);
    console.log(`  status: ${r3.status}`);
    console.log(`  content-disposition: ${r3.headers['content-disposition']}`);
    assertEqual(r3.status, 200, 'status code with inline=true');
    assertEqual(
      (r3.headers['content-disposition'] || '').startsWith('inline'),
      true,
      'disposition starts with "inline"',
    );

    // -- 8. Simulate missing file -> expect 404 --
    const absPath = path.join(uploadsRoot, attachment.storageKey);
    if (fs.existsSync(absPath)) {
      fs.renameSync(absPath, `${absPath}.bak`);
    }
    const r4 = await req('HEAD', `/document-attachments/${attachment.id}/download?inline=1`, { headers: authHeaders });
    console.log(`\nGET .../download?inline=1 (file removed):`);
    console.log(`  status: ${r4.status}`);
    assertEqual(r4.status, 404, 'status code when file missing on disk');
    // Restore the file so the script is rerunnable.
    if (fs.existsSync(`${absPath}.bak`)) {
      fs.renameSync(`${absPath}.bak`, absPath);
    }

    console.log('\nDone. Exit code:', process.exitCode || 0);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch(err => {
  console.error('VERIFY FAILED:', err);
  process.exit(1);
});
