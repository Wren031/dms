# DMS API

Secure authentication-only backend built with NestJS 11, Prisma 6 and PostgreSQL 13.

## Stack

- NestJS 11 + Express 5
- Prisma 6 (PostgreSQL)
- JWT access tokens (short-lived, Bearer header) + HTTP-only refresh cookies
- Argon2id password hashing
- @nestjs/throttler rate limiting, helmet security headers
- Jest unit + Supertest e2e test suites

## Prerequisites

- Node.js >= 20
- PostgreSQL running locally (default `postgres` / `123` on `localhost:5432`)

## Setup

```bash
npm install
npx prisma generate

# Create the databases (once)
createdb dms       # or via your DB tool / psql: CREATE DATABASE dms;
createdb dms_test

# Apply migrations to the dev database
npx prisma migrate deploy

# Apply migrations to the test database
$env:DATABASE_URL="postgresql://postgres:123@localhost:5432/dms_test"; npx prisma migrate deploy
```

Environment files:

| File        | Purpose                                                        |
| ----------- | -------------------------------------------------------------- |
| `.env`      | Development configuration (`NODE_ENV=development`)              |
| `.env.test` | Test configuration (`NODE_ENV=test`, loaded by the test setup)  |
| `.env.example` | Template with all documented variables                       |

Copy `.env.example` to `.env` and set real secrets. **Never commit `.env`.**

## Commands

| Command                 | Description                                  |
| ----------------------- | -------------------------------------------- |
| `npm run start:dev`     | Start in watch mode on `http://localhost:3000/api` |
| `npm run build`         | Compile to `dist/`                           |
| `npm run lint`          | ESLint (autofix)                             |
| `npm test`              | Unit tests (30)                              |
| `npm run test:e2e`      | E2E security suite (37) against `dms_test`   |
| `npm run prisma:migrate`| Create/apply migrations                      |

## Environment variables

See `.env.example` for the full annotated list. Key settings:

- `DATABASE_URL` – PostgreSQL connection string
- `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` – strong random values (`openssl rand -base64 64`)
- `JWT_ACCESS_EXPIRES_IN` / `JWT_REFRESH_EXPIRES_IN` – e.g. `15m` / `7d`
- `MAX_LOGIN_ATTEMPTS` / `LOCKOUT_DURATION_MINUTES` – brute-force lockout
- `ARGON2_*` – Argon2id cost parameters
- `THROTTLE_*` / `AUTH_THROTTLE_*` – global and auth rate limits
- `DEV_RETURN_TOKENS` – when `true`, verification/reset tokens are returned in responses (dev/test only; **must be `false` in production**)
- `FRONTEND_URL` – CORS origin for the frontend

## API

All routes are prefixed with `/api`. Responses use a consistent envelope
`{ success, message?, user?, accessToken?, ... }`; errors use
`{ success: false, statusCode, message, error }` with no stack traces.

| Method | Path                           | Auth  | Description                                    |
| ------ | ------------------------------ | ----- | ---------------------------------------------- |
| POST   | `/api/auth/register`           | –     | Register (status `PENDING`)                    |
| POST   | `/api/auth/login`              | –     | Login, sets `refresh_token` cookie             |
| POST   | `/api/auth/refresh`            | –     | Rotate refresh token (cookie only)             |
| POST   | `/api/auth/logout`             | JWT   | Revoke current session, clear cookie           |
| POST   | `/api/auth/logout-all`         | JWT   | Revoke every session                           |
| POST   | `/api/auth/verify-email`       | –     | Activate account (flips to `ACTIVE`)           |
| POST   | `/api/auth/resend-verification`| –     | Resend verification email                      |
| POST   | `/api/auth/forgot-password`    | –     | Generic response (anti-enumeration)            |
| POST   | `/api/auth/reset-password`     | –     | Reset password, revokes all sessions           |
| POST   | `/api/auth/change-password`    | JWT   | Change password, revokes all sessions          |
| GET    | `/api/auth/me`                 | JWT   | Current profile (no secrets leaked)            |
| GET    | `/api/users/:userId`           | JWT   | Profile, `@Ownership('userId')` enforced       |

## Security model

- **Guards (global, in order):** Throttler → JWT (`@Public()` opts out) → Roles → Permissions.
- **RBAC:** `USER` < `ADMIN` < `SUPER_ADMIN`; roles can be attached per route via `@Roles(...)`.
- **Object-level auth (IDOR/BOLA):** `@Ownership('userId')` + `AuthorizationService`; a
  `USER` may only access their own resources, `ADMIN`/`SUPER_ADMIN` bypass.
- **Refresh tokens:** never in the body/URL, HTTP-only cookie only; stored as SHA-256
  hashes; rotated on every refresh; reuse of a revoked token revokes the whole session
  family (`TOKEN_REUSE_DETECTED` audit entry).
- **Brute-force:** account lockout (`lockedUntil`) after `MAX_LOGIN_ATTEMPTS` failures;
  generic error messages prevent email/account enumeration.
- **Client-supplied `role`/`status` are rejected** (`forbidNonWhitelisted` → 400).
- **Audit trail:** `AuditLog` records security events (`LOGIN_SUCCESS`, `LOGIN_FAILED`,
  `LOGOUT`, `TOKEN_REUSE_DETECTED`, ...) with IP/UA; credentials never logged.
- **Input:** global `ValidationPipe` with strict whitelisting; UUID params validated in
  the ownership guard before authorization logic runs.
- **Headers:** Helmet (CSP, HSTS in production), CORS restricted to `FRONTEND_URL` with
  `credentials: true`, `trust proxy` enabled for reverse proxies.

## Architecture

```
src/
  main.ts                  bootstrap, helmet, CORS, global pipe
  app.module.ts            ConfigModule, throttlers, global guards/filter/interceptor
  config/                  env validation (Joi-like), typed configuration
  prisma/                  PrismaService (global)
  common/                  guards, decorators, pipes, filters, interceptors,
                           AuthorizationService, CommonModule (global)
  modules/
    auth-module/           controller, service, repository, DTOs, strategies,
                           token/cookie/hash/email services, enums, errors
    audit-module/          AuditService
    users-module/          /users endpoints with ownership protection
```

## Testing notes

- Unit tests mock all dependencies; 30 tests.
- E2E tests run against `dms_test` and clean it before the suite. They rely on
  `DEV_RETURN_TOKENS=true` in `.env.test` (verification/reset tokens returned in responses).
- `.env.test` is loaded in `test/setup-env.ts` **before** `AppModule` is imported so that
  neither Prisma's import-time `.env` load nor `@nestjs/config`'s `process.env` merge can
  leak development values into the test run.
