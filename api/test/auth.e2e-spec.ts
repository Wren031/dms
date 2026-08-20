import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { AccountStatus, UserRole } from '@prisma/client';
import * as argon2 from 'argon2';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { GlobalValidationPipe } from '../src/common/pipes/validation.pipe';
import { PrismaService } from '../src/prisma/prisma.service';

/**
 * End-to-end security tests.
 *
 * Requires a running PostgreSQL and the DATABASE_URL from `.env.test`
 * (database `dms_test` must exist and be migrated).
 *
 * Run with: npm run test:e2e
 */

const BASE = '/api';
const PASSWORD = 'StrongPass123!';

describe('Authentication & Authorization (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  const api = () => request(app.getHttpServer());

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api');
    app.use(cookieParser());
    app.useGlobalPipes(new GlobalValidationPipe());
    app.enableCors({ origin: true, credentials: true });
    await app.init();

    prisma = app.get(PrismaService);
    await cleanDatabase();
  });

  afterAll(async () => {
    await app.close();
  });

  async function cleanDatabase(): Promise<void> {
    await prisma.auditLog.deleteMany();
    await prisma.refreshToken.deleteMany();
    await prisma.emailVerificationToken.deleteMany();
    await prisma.passwordResetToken.deleteMany();
    await prisma.user.deleteMany();
  }

  async function register(email: string) {
    return api()
      .post(`${BASE}/auth/register`)
      .send({ email, password: PASSWORD, confirmPassword: PASSWORD })
      .expect(201);
  }

  async function registerAndVerify(email: string) {
    const reg = await register(email);
    const token = reg.body.verificationToken;
    expect(token).toBeDefined();
    await api().post(`${BASE}/auth/verify-email`).send({ token }).expect(200);
    return reg.body.user as { id: string; email: string };
  }

  async function login(agent: request.Agent, email: string, pwd = PASSWORD) {
    return agent.post(`${BASE}/auth/login`).send({ email, password: pwd }).expect(200);
  }

  async function loginGetToken(agent: request.Agent, email: string, pwd = PASSWORD) {
    const res = await agent.post(`${BASE}/auth/login`).send({ email, password: pwd }).expect(200);
    return res.body.accessToken as string;
  }

  async function createUserWithRole(email: string, role: UserRole, status = AccountStatus.ACTIVE) {
    const passwordHash = await argon2.hash(PASSWORD, { type: argon2.argon2id });
    return prisma.user.create({
      data: { email, passwordHash, role, status },
    });
  }

  describe('Registration', () => {
    it('registers successfully with normalized email and least-privilege defaults', async () => {
      const res = await api()
        .post(`${BASE}/auth/register`)
        .send({
          email: '  New.User@Test.com ',
          password: PASSWORD,
          confirmPassword: PASSWORD,
        })
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.user.email).toBe('new.user@test.com');
      expect(res.body.user.role).toBe(UserRole.USER);
      expect(res.body.user.status).toBe(AccountStatus.PENDING);
      expect(res.body.user.passwordHash).toBeUndefined();
      expect(res.body.user.failedLoginAttempts).toBeUndefined();
      expect(res.body.user.lockedUntil).toBeUndefined();
      expect(res.body.verificationToken).toBeDefined();

      const audit = await prisma.auditLog.findFirst({
        where: { action: 'REGISTER', userId: res.body.user.id },
      });
      expect(audit).not.toBeNull();
    });

    it('rejects client-supplied role/status manipulation', async () => {
      await api()
        .post(`${BASE}/auth/register`)
        .send({
          email: 'role-manip@test.com',
          password: PASSWORD,
          confirmPassword: PASSWORD,
          role: 'SUPER_ADMIN',
        })
        .expect(400);

      await api()
        .post(`${BASE}/auth/register`)
        .send({
          email: 'status-manip@test.com',
          password: PASSWORD,
          confirmPassword: PASSWORD,
          status: 'ACTIVE',
        })
        .expect(400);
    });

    it('rejects duplicate email', async () => {
      await register('dup@test.com');
      await api()
        .post(`${BASE}/auth/register`)
        .send({ email: 'dup@test.com', password: PASSWORD, confirmPassword: PASSWORD })
        .expect(409);
    });

    it('rejects invalid email', async () => {
      await api()
        .post(`${BASE}/auth/register`)
        .send({ email: 'not-an-email', password: PASSWORD, confirmPassword: PASSWORD })
        .expect(400);
    });

    it('rejects weak or non-complex passwords', async () => {
      await api()
        .post(`${BASE}/auth/register`)
        .send({ email: 'weak@test.com', password: 'short', confirmPassword: 'short' })
        .expect(400);
      await api()
        .post(`${BASE}/auth/register`)
        .send({
          email: 'weak2@test.com',
          password: 'onlylowercase123',
          confirmPassword: 'onlylowercase123',
        })
        .expect(400);
    });

    it('rejects mismatched passwords', async () => {
      await api()
        .post(`${BASE}/auth/register`)
        .send({ email: 'mismatch@test.com', password: PASSWORD, confirmPassword: 'Different123!' })
        .expect(400);
    });

    it('rejects unknown properties (forbidNonWhitelisted)', async () => {
      await api()
        .post(`${BASE}/auth/register`)
        .send({
          email: 'unknown-prop@test.com',
          password: PASSWORD,
          confirmPassword: PASSWORD,
          evil: 'x',
        })
        .expect(400);
    });

    it('rejects oversized password (> 128 chars)', async () => {
      await api()
        .post(`${BASE}/auth/register`)
        .send({
          email: 'oversize@test.com',
          password: `A1!${'x'.repeat(130)}`,
          confirmPassword: `A1!${'x'.repeat(130)}`,
        })
        .expect(400);
    });
  });

  describe('Login & brute-force protection', () => {
    it('logs in with valid credentials, sets httpOnly cookie, returns access token', async () => {
      const email = 'login-ok@test.com';
      await registerAndVerify(email);
      const agent = request.agent(app.getHttpServer());

      const res = await login(agent, email);

      expect(res.body.success).toBe(true);
      expect(res.body.accessToken).toBeDefined();
      expect(res.body.user.passwordHash).toBeUndefined();

      const setCookie = res.headers['set-cookie'] as unknown as string[];
      const refreshCookie = setCookie.find((c) => c.startsWith('refresh_token='));
      expect(refreshCookie).toBeDefined();
      expect(refreshCookie).toContain('HttpOnly');
      expect(refreshCookie).toContain('Path=/api/auth');
    });

    it('returns generic error for wrong password and unknown email (anti-enumeration)', async () => {
      const email = 'login-wrong@test.com';
      await registerAndVerify(email);

      const wrong = await api()
        .post(`${BASE}/auth/login`)
        .send({ email, password: 'WrongPass123!' })
        .expect(401);
      expect(wrong.body.message).toBe('Invalid email or password');

      const ghost = await api()
        .post(`${BASE}/auth/login`)
        .send({ email: 'ghost@test.com', password: 'WrongPass123!' })
        .expect(401);
      expect(ghost.body.message).toBe('Invalid email or password');
    });

    it('locks the account after MAX_LOGIN_ATTEMPTS failed attempts', async () => {
      const email = 'lock@test.com';
      await registerAndVerify(email);

      for (let i = 0; i < 3; i++) {
        await api()
          .post(`${BASE}/auth/login`)
          .send({ email, password: 'WrongPass123!' })
          .expect(401);
      }

      const user = await prisma.user.findUnique({ where: { email } });
      expect(user?.failedLoginAttempts).toBe(3);
      expect(user?.lockedUntil).toBeDefined();

      // Even a correct password is rejected while locked (generic message).
      const res = await api()
        .post(`${BASE}/auth/login`)
        .send({ email, password: PASSWORD })
        .expect(401);
      expect(res.body.message).toBe('Invalid email or password');

      const audit = await prisma.auditLog.findFirst({
        where: { action: 'ACCOUNT_LOCKED', userId: user?.id },
      });
      expect(audit).not.toBeNull();
    });

    it('allows login again after lockout expires', async () => {
      const email = 'lock-expire@test.com';
      await registerAndVerify(email);

      for (let i = 0; i < 3; i++) {
        await api()
          .post(`${BASE}/auth/login`)
          .send({ email, password: 'WrongPass123!' })
          .expect(401);
      }

      // Force lockout to expire.
      await prisma.user.update({
        where: { email },
        data: { lockedUntil: new Date(Date.now() - 1000), failedLoginAttempts: 0 },
      });

      const agent = request.agent(app.getHttpServer());
      await login(agent, email);
    });

    it('resets failed attempts after a successful login', async () => {
      const email = 'reset-attempts@test.com';
      await registerAndVerify(email);

      await api().post(`${BASE}/auth/login`).send({ email, password: 'WrongPass123!' }).expect(401);

      const agent = request.agent(app.getHttpServer());
      await login(agent, email);

      const user = await prisma.user.findUnique({ where: { email } });
      expect(user?.failedLoginAttempts).toBe(0);
      expect(user?.lockedUntil).toBeNull();
      expect(user?.lastLoginAt).toBeDefined();
    });

    it('rejects login for unverified accounts (status PENDING)', async () => {
      const email = 'pending@test.com';
      await register(email);
      await api().post(`${BASE}/auth/login`).send({ email, password: PASSWORD }).expect(401);
    });
  });

  describe('Refresh token rotation & reuse detection', () => {
    it('rotates refresh tokens and detects reuse of the old token', async () => {
      const email = 'rotation@test.com';
      await registerAndVerify(email);

      const agent = request.agent(app.getHttpServer());
      const loginRes = await login(agent, email);
      const firstCookie = loginRes.headers['set-cookie'][0].split(';')[0];

      const refreshRes = await agent.post(`${BASE}/auth/refresh`).send({}).expect(200);
      const secondCookie = refreshRes.headers['set-cookie'][0].split(';')[0];
      expect(secondCookie).not.toBe(firstCookie);
      expect(refreshRes.body.accessToken).toBeDefined();

      // Replaying the old (already rotated) token = reuse detected.
      await request(app.getHttpServer())
        .post(`${BASE}/auth/refresh`)
        .set('Cookie', firstCookie)
        .send({})
        .expect(401);

      // Reuse detection revokes the entire token family.
      await request(app.getHttpServer())
        .post(`${BASE}/auth/refresh`)
        .set('Cookie', secondCookie)
        .send({})
        .expect(401);

      const reuseAudit = await prisma.auditLog.findFirst({
        where: { action: 'TOKEN_REUSE_DETECTED' },
      });
      expect(reuseAudit).not.toBeNull();
    });

    it('rejects refresh without a cookie', async () => {
      await api().post(`${BASE}/auth/refresh`).send({}).expect(401);
    });

    it('rejects a body-supplied token even if the cookie is missing', async () => {
      await api()
        .post(`${BASE}/auth/refresh`)
        .set('Content-Type', 'application/json')
        .send({ refreshToken: 'faketoken' })
        .expect(400);
    });
  });

  describe('Logout & session revocation', () => {
    it('logout clears the cookie and revokes the current session', async () => {
      const email = 'logout@test.com';
      await registerAndVerify(email);

      const agent = request.agent(app.getHttpServer());
      const token = await loginGetToken(agent, email);

      const logoutRes = await agent
        .post(`${BASE}/auth/logout`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
      const setCookie = logoutRes.headers['set-cookie'] as unknown as string[];
      expect(setCookie.some((c) => c.startsWith('refresh_token=;'))).toBe(true);

      // Cookie is gone -> refresh impossible.
      await agent.post(`${BASE}/auth/refresh`).send({}).expect(401);
    });

    it('logout-all revokes every session for the user', async () => {
      const email = 'logout-all@test.com';
      await registerAndVerify(email);

      const agentA = request.agent(app.getHttpServer());
      const agentB = request.agent(app.getHttpServer());
      await login(agentA, email);
      await login(agentB, email);

      const token = await loginGetToken(agentA, email);
      await agentA
        .post(`${BASE}/auth/logout-all`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      await agentB.post(`${BASE}/auth/refresh`).send({}).expect(401);

      const user = await prisma.user.findUnique({ where: { email } });
      const sessions = await prisma.refreshToken.findMany({ where: { userId: user?.id } });
      expect(sessions.length).toBeGreaterThanOrEqual(2);
      expect(sessions.every((s) => s.revokedAt !== null)).toBe(true);
    });
  });

  describe('Email verification', () => {
    it('verifies email and activates the account', async () => {
      const email = 'verify@test.com';
      const reg = await register(email);
      const pending = await prisma.user.findUnique({ where: { email } });
      expect(pending?.status).toBe(AccountStatus.PENDING);
      expect(pending?.emailVerified).toBe(false);

      await api()
        .post(`${BASE}/auth/verify-email`)
        .send({ token: reg.body.verificationToken })
        .expect(200);

      const verified = await prisma.user.findUnique({ where: { email } });
      expect(verified?.status).toBe(AccountStatus.ACTIVE);
      expect(verified?.emailVerified).toBe(true);

      const audit = await prisma.auditLog.findFirst({
        where: { action: 'EMAIL_VERIFIED', userId: verified?.id },
      });
      expect(audit).not.toBeNull();
    });

    it('rejects an invalid verification token', async () => {
      await api()
        .post(`${BASE}/auth/verify-email`)
        .send({ token: 'not-a-real-token-that-is-long-enough' })
        .expect(401);
    });

    it('rejects a reused verification token', async () => {
      const email = 'verify-once@test.com';
      const reg = await register(email);
      const token = reg.body.verificationToken;
      await api().post(`${BASE}/auth/verify-email`).send({ token }).expect(200);
      await api().post(`${BASE}/auth/verify-email`).send({ token }).expect(401);
    });
  });

  describe('Password reset', () => {
    it('forgot-password returns a generic response for existing and unknown emails', async () => {
      await registerAndVerify('exists-reset@test.com');

      const existing = await api()
        .post(`${BASE}/auth/forgot-password`)
        .send({ email: 'exists-reset@test.com' })
        .expect(200);
      expect(existing.body.message).toContain('If an account exists');

      const unknown = await api()
        .post(`${BASE}/auth/forgot-password`)
        .send({ email: 'nobody@test.com' })
        .expect(200);
      expect(unknown.body.message).toBe(existing.body.message);
    });

    it('resets password, invalidates old sessions and allows login with new password', async () => {
      const email = 'do-reset@test.com';
      const user = await registerAndVerify(email);

      const agent = request.agent(app.getHttpServer());
      await login(agent, email);

      const forgot = await api().post(`${BASE}/auth/forgot-password`).send({ email }).expect(200);
      const resetToken = forgot.body.resetToken;
      expect(resetToken).toBeDefined();

      const newPassword = 'NewStrongPass456!';
      await api()
        .post(`${BASE}/auth/reset-password`)
        .send({ token: resetToken, password: newPassword, confirmPassword: newPassword })
        .expect(200);

      // Old refresh session is invalidated.
      await agent.post(`${BASE}/auth/refresh`).send({}).expect(401);

      // Login with the new password.
      const agent2 = request.agent(app.getHttpServer());
      await login(agent2, email, newPassword);

      const audit = await prisma.auditLog.findFirst({
        where: { action: 'PASSWORD_RESET', userId: user.id },
      });
      expect(audit).not.toBeNull();
    });

    it('rejects a bogus or expired reset token', async () => {
      await api()
        .post(`${BASE}/auth/reset-password`)
        .send({
          token: 'bogus-token-that-is-long-enough',
          password: PASSWORD,
          confirmPassword: PASSWORD,
        })
        .expect(401);
    });
  });

  describe('Change password', () => {
    it('changes password and revokes refresh sessions', async () => {
      const email = 'change-pw@test.com';
      await registerAndVerify(email);

      const agent = request.agent(app.getHttpServer());
      await login(agent, email);

      const newPassword = 'ChangedPass789!';
      const token = await loginGetToken(agent, email);
      await api()
        .post(`${BASE}/auth/change-password`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          currentPassword: PASSWORD,
          newPassword,
          confirmPassword: newPassword,
        })
        .expect(200);

      // All refresh sessions revoked after the password change.
      await agent.post(`${BASE}/auth/refresh`).send({}).expect(401);

      const agent2 = request.agent(app.getHttpServer());
      await login(agent2, email, newPassword);
    });

    it('rejects wrong current password', async () => {
      const email = 'change-pw-bad@test.com';
      await registerAndVerify(email);
      const agent = request.agent(app.getHttpServer());
      const token = await loginGetToken(agent, email);

      await api()
        .post(`${BASE}/auth/change-password`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          currentPassword: 'WrongCurrent1!',
          newPassword: 'ChangedPass789!',
          confirmPassword: 'ChangedPass789!',
        })
        .expect(400);
    });
  });

  describe('Protected endpoints & authentication', () => {
    it('rejects requests without a bearer token', async () => {
      await api().get(`${BASE}/auth/me`).expect(401);
      await api().get(`${BASE}/users/me`).expect(401);
    });

    it('rejects a malformed token', async () => {
      await api().get(`${BASE}/auth/me`).set('Authorization', 'Bearer not.a.jwt').expect(401);
    });

    it('does not leak secrets in the profile response', async () => {
      const email = 'leak-check@test.com';
      await registerAndVerify(email);
      const agent = request.agent(app.getHttpServer());
      const token = await loginGetToken(agent, email);

      const res = await api()
        .get(`${BASE}/auth/me`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body.user.passwordHash).toBeUndefined();
      expect(res.body.user.refreshToken).toBeUndefined();
      expect(res.body.user.emailVerificationToken).toBeUndefined();
      expect(res.body.user.failedLoginAttempts).toBeUndefined();
      expect(res.body.user.lockedUntil).toBeUndefined();
    });
  });

  describe('RBAC & object-level authorization (IDOR / BOLA)', () => {
    it('USER can access own profile but not another users profile (403)', async () => {
      const userA = await registerAndVerify('idora@test.com');
      await registerAndVerify('idorb@test.com');

      const agent = request.agent(app.getHttpServer());
      const token = await loginGetToken(agent, 'idora@test.com');

      const own = await api()
        .get(`${BASE}/users/${userA.id}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
      expect(own.body.user.id).toBe(userA.id);

      // IDOR/BOLA attempt: User A requests User B's resource by UUID.
      const userB = await prisma.user.findUnique({ where: { email: 'idorb@test.com' } });
      await api()
        .get(`${BASE}/users/${userB?.id}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(403);
    });

    it('ADMIN can access any users profile', async () => {
      await createUserWithRole('admin@test.com', UserRole.ADMIN);
      const victim = await registerAndVerify('victim@test.com');

      const agent = request.agent(app.getHttpServer());
      const token = await loginGetToken(agent, 'admin@test.com');

      const res = await api()
        .get(`${BASE}/users/${victim.id}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
      expect(res.body.user.id).toBe(victim.id);
    });

    it('rejects malformed/non-UUID identifiers', async () => {
      await registerAndVerify('uuid@test.com');
      const agent = request.agent(app.getHttpServer());
      const token = await loginGetToken(agent, 'uuid@test.com');

      await api()
        .get(`${BASE}/users/not-a-uuid`)
        .set('Authorization', `Bearer ${token}`)
        .expect(400);
    });

    it('a valid JWT never grants access to another users resource', async () => {
      await registerAndVerify('bolaa@test.com');
      const userB = await registerAndVerify('bolab@test.com');

      const agent = request.agent(app.getHttpServer());
      const token = await loginGetToken(agent, 'bolaa@test.com');

      // Even knowing userB's UUID, userA cannot read userB.
      await api()
        .get(`${BASE}/users/${userB.id}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(403);
    });
  });

  describe('Audit trail', () => {
    it('records LOGIN_SUCCESS, LOGIN_FAILED and LOGOUT', async () => {
      const email = 'audit@test.com';
      const user = await registerAndVerify(email);

      await api().post(`${BASE}/auth/login`).send({ email, password: 'WrongPass123!' }).expect(401);

      const agent = request.agent(app.getHttpServer());
      await login(agent, email);
      const token = await loginGetToken(agent, email);
      await agent.post(`${BASE}/auth/logout`).set('Authorization', `Bearer ${token}`).expect(200);

      const actions = await prisma.auditLog.findMany({
        where: { userId: user.id },
        select: { action: true },
      });
      const actionNames = actions.map((a) => a.action);
      expect(actionNames).toContain('LOGIN_SUCCESS');
      expect(actionNames).toContain('LOGIN_FAILED');
      expect(actionNames).toContain('LOGOUT');
    });

    it('never stores credentials in audit logs', async () => {
      const email = 'audit-clean@test.com';
      const user = await registerAndVerify(email);
      await api().post(`${BASE}/auth/forgot-password`).send({ email }).expect(200);

      const logs = await prisma.auditLog.findMany({ where: { userId: user.id } });
      for (const log of logs) {
        const raw = JSON.stringify(log);
        expect(raw).not.toContain('passwordHash');
        expect(raw).not.toContain('refresh_token');
        expect(raw).not.toContain('accessToken');
      }
    });
  });

  describe('Error handling', () => {
    it('returns a consistent error envelope without stack traces', async () => {
      const res = await api()
        .post(`${BASE}/auth/login`)
        .send({ email: 'x@test.com', password: 'wrongpass' })
        .expect(401);
      expect(res.body).toMatchObject({ success: false, statusCode: 401 });
      expect(res.body.stack).toBeUndefined();
    });
  });
});
