import { PrismaClient } from '@prisma/client';

let prismaClient: PrismaClient | null = null;

/** Singleton — avoids opening a new connection pool per call site. */
export function getPrismaClient(): PrismaClient {
  if (!prismaClient) {
    prismaClient = new PrismaClient({
      log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
      errorFormat: 'pretty',
    });
  }

  return prismaClient;
}

export async function disconnectPrisma(): Promise<void> {
  if (prismaClient) {
    await prismaClient.$disconnect();
    prismaClient = null;
  }
}

export async function healthCheck(): Promise<{ healthy: boolean; message: string }> {
  try {
    const prisma = getPrismaClient();
    await prisma.$queryRaw`SELECT 1`;
    return { healthy: true, message: 'Database connection OK' };
  } catch (error) {
    return { healthy: false, message: `Database connection failed: ${error}` };
  }
}
