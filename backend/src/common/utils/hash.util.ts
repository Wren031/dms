import * as argon2 from 'argon2';

const ARGON2_OPTIONS: argon2.Options = {
  type: argon2.argon2id,
  memoryCost: 19_456,
  timeCost: 2,
  parallelism: 1,
};

// Pre-computed dummy hash for timing-safe comparison when the user is not found.
// Generated once with: argon2.hash('dummy-password-for-timing', ARGON2_OPTIONS)
const DUMMY_HASH =
  '$argon2id$v=19$m=19456,t=2,p=1$ZHVtbXlzYWx0ZHVtbXlzYWx0$b8Z2kSCDkfWSGm2FQ/gcfJgXfM2aW8eR3bBPmY3hU1A';

export async function hashPassword(plain: string): Promise<string> {
  return argon2.hash(plain, ARGON2_OPTIONS);
}

export async function verifyPassword(hash: string, plain: string): Promise<boolean> {
  try {
    return await argon2.verify(hash, plain);
  } catch {
    return false;
  }
}

/**
 * Always performs an argon2 verify to keep login timing independent of whether
 * the user exists. When the user is not found we compare against a dummy hash.
 */
export async function constantTimeVerify(plain: string, realHash: string | null): Promise<boolean> {
  const target = realHash ?? DUMMY_HASH;
  return verifyPassword(target, plain);
}
