import { PrismaClient } from '@prisma/client';
import { CalculationRepository } from '../../../src/infrastructure/persistence/repositories/CalculationRepository';
import { getPrismaClient, disconnectPrisma } from '../../../src/infrastructure/config/database';

describe('CalculationRepository - Integration', () => {
  let calcRepo: CalculationRepository;
  let prisma: PrismaClient;
  let productId: string;

  beforeAll(async () => {
    prisma = getPrismaClient();
    calcRepo = new CalculationRepository(prisma);

    await prisma.calculation.deleteMany({});
    await prisma.product.deleteMany({});
    await prisma.category.deleteMany({});

    const category = await prisma.category.create({ data: { name: 'Test' } });
    const product = await prisma.product.create({
      data: {
        name: 'Test Product',
        categoryId: category.id,
        standardWidth: 300,
        standardHeight: 200,
        thickness: 18,
        pricePerUnit: 100,
        currency: 'EUR',
      },
    });

    productId = product.id;
  });

  afterEach(async () => {
    await prisma.calculation.deleteMany({});
  });

  afterAll(async () => {
    await prisma.calculation.deleteMany({});
    await prisma.product.deleteMany({});
    await prisma.category.deleteMany({});
    await disconnectPrisma();
  });

  describe('save()', () => {
    test('should create calculation', async () => {
      const saved = await calcRepo.save({
        id: 'calc_test_1',
        productId,
        requestedPieces: [{ width: 200, height: 100 }],
        totalAreaNeeded: 2,
        boardsUsed: 0.4,
        pricePerBoard: 100,
        totalPrice: 40,
      });

      expect(saved.id).toBe('calc_test_1');
      expect(saved.totalPrice).toBe(40);
      expect(saved.status).toBe('DRAFT');
      expect(saved.product.name).toBe('Test Product');
    });

    test('should serialize requestedPieces as JSON and round-trip correctly', async () => {
      const pieces = [
        { width: 200, height: 100 },
        { width: 150, height: 150 },
      ];

      const saved = await calcRepo.save({
        id: 'calc_test_2',
        productId,
        requestedPieces: pieces,
        totalAreaNeeded: 4.25,
        boardsUsed: 0.72,
        pricePerBoard: 100,
        totalPrice: 72,
      });

      expect(saved.requestedPieces).toEqual(pieces);
    });

    test('should persist userId when provided', async () => {
      const saved = await calcRepo.save({
        id: 'calc_test_user',
        productId,
        requestedPieces: [{ width: 100, height: 100 }],
        totalAreaNeeded: 1,
        boardsUsed: 0.2,
        pricePerBoard: 100,
        totalPrice: 20,
        userId: 'user_123',
      });

      expect(saved.userId).toBe('user_123');
    });
  });

  describe('findById()', () => {
    test('should fetch calculation by ID', async () => {
      await calcRepo.save({
        id: 'calc_test_3',
        productId,
        requestedPieces: [{ width: 100, height: 100 }],
        totalAreaNeeded: 1,
        boardsUsed: 0.2,
        pricePerBoard: 100,
        totalPrice: 20,
      });

      const found = await calcRepo.findById('calc_test_3');

      expect(found?.id).toBe('calc_test_3');
      expect(found?.totalPrice).toBe(20);
    });

    test('should return null if not found', async () => {
      const found = await calcRepo.findById('calc_invalid');
      expect(found).toBeNull();
    });
  });

  describe('update()', () => {
    test('should update DRAFT calculation', async () => {
      await calcRepo.save({
        id: 'calc_test_4',
        productId,
        requestedPieces: [{ width: 100, height: 100 }],
        totalAreaNeeded: 1,
        boardsUsed: 0.2,
        pricePerBoard: 100,
        totalPrice: 20,
      });

      const updated = await calcRepo.update('calc_test_4', {
        requestedPieces: [{ width: 200, height: 200 }],
      });

      expect(updated.requestedPieces).toEqual([{ width: 200, height: 200 }]);
    });

    test('should reject updating a non-DRAFT calculation', async () => {
      await prisma.calculation.create({
        data: {
          id: 'calc_test_5',
          productId,
          requestedPieces: [{ width: 100, height: 100 }],
          totalAreaNeeded: 1,
          boardsUsed: 0.2,
          pricePerBoard: 100,
          totalPrice: 20,
          status: 'COMPLETED',
        },
      });

      await expect(calcRepo.update('calc_test_5', { totalPrice: 50 })).rejects.toThrow(
        'Cannot update COMPLETED calculation'
      );
    });

    test('should reject updating a calculation that does not exist', async () => {
      await expect(calcRepo.update('calc_missing', {})).rejects.toThrow('Calculation not found');
    });
  });

  describe('delete()', () => {
    test('should delete DRAFT calculation', async () => {
      await calcRepo.save({
        id: 'calc_test_6',
        productId,
        requestedPieces: [{ width: 100, height: 100 }],
        totalAreaNeeded: 1,
        boardsUsed: 0.2,
        pricePerBoard: 100,
        totalPrice: 20,
      });

      await calcRepo.delete('calc_test_6');

      const found = await calcRepo.findById('calc_test_6');
      expect(found).toBeNull();
    });

    test('should reject deleting a non-DRAFT calculation', async () => {
      await prisma.calculation.create({
        data: {
          id: 'calc_test_7',
          productId,
          requestedPieces: [{ width: 100, height: 100 }],
          totalAreaNeeded: 1,
          boardsUsed: 0.2,
          pricePerBoard: 100,
          totalPrice: 20,
          status: 'SUBMITTED',
        },
      });

      await expect(calcRepo.delete('calc_test_7')).rejects.toThrow('Cannot delete SUBMITTED calculation');
    });
  });

  describe('findByUserId()', () => {
    test('should find calculations by user ID', async () => {
      await calcRepo.save({
        id: 'calc_test_8',
        productId,
        requestedPieces: [{ width: 100, height: 100 }],
        totalAreaNeeded: 1,
        boardsUsed: 0.2,
        pricePerBoard: 100,
        totalPrice: 20,
        userId: 'user_456',
      });

      const calculations = await calcRepo.findByUserId('user_456');

      expect(calculations.length).toBeGreaterThan(0);
      expect(calculations[0].id).toBe('calc_test_8');
    });
  });

  describe('countByStatus()', () => {
    test('should count calculations by status', async () => {
      await calcRepo.save({
        id: 'calc_test_9',
        productId,
        requestedPieces: [{ width: 100, height: 100 }],
        totalAreaNeeded: 1,
        boardsUsed: 0.2,
        pricePerBoard: 100,
        totalPrice: 20,
      });

      const count = await calcRepo.countByStatus('DRAFT');
      expect(count).toBeGreaterThanOrEqual(1);
    });
  });
});
