import { ConflictException } from '@nestjs/common';
import { Prisma } from '@prisma/client';

type FieldMessages = Record<string, string>;

function uniqueFields(err: Prisma.PrismaClientKnownRequestError): string[] {
  const target = (err.meta?.target as string | string[] | undefined) ?? [];
  return Array.isArray(target) ? target : [target];
}

export function throwOnUniqueConflict(
  err: unknown,
  fieldMessages: FieldMessages,
  fallback = 'That value is already in use.',
): never {
  if (
    err instanceof Prisma.PrismaClientKnownRequestError &&
    err.code === 'P2002'
  ) {
    const fields = uniqueFields(err);
    const message =
      fields
        .map(field => fieldMessages[field])
        .find(Boolean) ?? fallback;
    throw new ConflictException(message);
  }
  throw err;
}