import { PrismaClient } from '@prisma/client';

type PrismaGlobal = typeof globalThis & {
  __msBeautyPrisma?: PrismaClient;
};

const prismaGlobal = globalThis as PrismaGlobal;

export function isDatabaseConfigured(): boolean {
  const databaseUrl = process.env.DATABASE_URL?.trim();
  return Boolean(databaseUrl && !databaseUrl.includes('your-password') && !databaseUrl.includes('your-project'));
}

/**
 * Returns null instead of attempting a connection when local/demo deployments
 * have no database credentials. Callers should explicitly use their demo
 * fallback in that case.
 */
export function getPrismaClient(): PrismaClient | null {
  if (!isDatabaseConfigured()) {
    return null;
  }

  if (!prismaGlobal.__msBeautyPrisma) {
    prismaGlobal.__msBeautyPrisma = new PrismaClient({
      log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
    });
  }

  return prismaGlobal.__msBeautyPrisma;
}

/** Useful for a read path that has a deterministic local fallback. */
export async function withPrismaFallback<T>(
  fallback: T,
  operation: (client: PrismaClient) => Promise<T>
): Promise<T> {
  const client = getPrismaClient();
  return client ? operation(client) : fallback;
}
