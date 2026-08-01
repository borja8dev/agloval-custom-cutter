jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn().mockImplementation(() => ({
    $queryRaw: jest.fn(),
    $disconnect: jest.fn(),
  })),
}));

import {
  getPrismaClient,
  healthCheck,
  disconnectPrisma,
} from '../../../src/infrastructure/config/database';

describe('database config', () => {
  afterEach(async () => {
    await disconnectPrisma();
    jest.clearAllMocks();
  });

  describe('getPrismaClient()', () => {
    test('returns the same instance on repeated calls (singleton)', () => {
      const a = getPrismaClient();
      const b = getPrismaClient();
      expect(a).toBe(b);
    });
  });

  describe('healthCheck()', () => {
    test('returns healthy: true when the query succeeds', async () => {
      const prisma = getPrismaClient();
      (prisma.$queryRaw as jest.Mock).mockResolvedValue([{ '?column?': 1 }]);

      const result = await healthCheck();

      expect(result).toEqual({ healthy: true, message: 'Database connection OK' });
    });

    test('returns healthy: false with the error message when the query fails', async () => {
      const prisma = getPrismaClient();
      (prisma.$queryRaw as jest.Mock).mockRejectedValue(new Error('connection refused'));

      const result = await healthCheck();

      expect(result.healthy).toBe(false);
      expect(result.message).toContain('connection refused');
    });
  });
});
