import { CalculationApplicationService } from '../../../src/application/services/CalculationApplicationService';
import {
  IProductRepository,
  ICalculationRepository,
  CalculationRecord,
} from '../../../src/application/ports/out/CalculationPersistence';
import { CalculationRequestDTO } from '../../../src/application/dto/CalculationRequest';
import {
  ProductNotFoundException,
  CalculationNotFoundException,
  InvalidCalculationStatusException,
} from '../../../src/application/exceptions/ApplicationException';

describe('CalculationApplicationService', () => {
  let service: CalculationApplicationService;
  let mockProductRepo: IProductRepository;
  let mockCalculationRepo: ICalculationRepository;

  beforeEach(() => {
    mockProductRepo = {
      findById: jest.fn().mockResolvedValue({
        id: 'prod_1',
        name: 'Melamina Blanca 300x200',
        categoryName: 'Melamina',
        standardWidth: 300,
        standardHeight: 200,
        thickness: 18,
        pricePerUnit: 100,
        currency: 'EUR',
      }),
      findAll: jest.fn(),
      findByCategory: jest.fn(),
      search: jest.fn(),
    };

    // Echoes back what calculate() actually computed, as a real repository
    // would after persisting it — mapToDTOFromEntity() rebuilds the response
    // from this, so the mock needs to be a believable full CalculationRecord.
    mockCalculationRepo = {
      save: jest
        .fn()
        .mockImplementation((data: Partial<CalculationRecord>): Promise<CalculationRecord> =>
          Promise.resolve({
            id: 'calc_123',
            productId: data.productId!,
            requestedPieces: data.requestedPieces!,
            totalAreaNeeded: data.totalAreaNeeded!,
            boardsUsed: data.boardsUsed!,
            pricePerBoard: data.pricePerBoard!,
            totalPrice: data.totalPrice!,
            status: data.status ?? 'DRAFT',
            userId: data.userId,
            createdAt: new Date(),
            expiresAt: data.expiresAt,
            product: {
              id: 'prod_1',
              name: 'Melamina Blanca 300x200',
              standardWidth: 300,
              standardHeight: 200,
              thickness: 18,
              category: { name: 'Melamina' },
            },
          })
        ),
      findById: jest.fn(),
      findByUserId: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };

    service = new CalculationApplicationService(mockProductRepo, mockCalculationRepo);
  });

  describe('calculate()', () => {
    test('should calculate and return DTO with correct pricing', async () => {
      const request: CalculationRequestDTO = {
        productId: 'prod_1',
        requestedPieces: [
          { width: 200, height: 100 },
          { width: 200, height: 100 },
          { width: 250, height: 120 },
        ],
      };

      const response = await service.calculate(request);

      expect(response).toBeDefined();
      expect(response.id).toBeDefined();
      expect(response.product.name).toBe('Melamina Blanca 300x200');
      expect(response.calculation.boardsNeeded).toBe(1.2);
      expect(response.pricing.totalPrice).toBe(120); // 1.2 x 100
      expect(response.pricing.currency).toBe('EUR');
      expect(response.metadata.status).toBe('DRAFT');
    });

    test('should throw ProductNotFoundException if product not found', async () => {
      const mockRepoNotFound: IProductRepository = {
        findById: jest.fn().mockResolvedValue(null),
        findAll: jest.fn(),
        findByCategory: jest.fn(),
        search: jest.fn(),
      };

      const serviceNotFound = new CalculationApplicationService(
        mockRepoNotFound,
        mockCalculationRepo
      );

      const request: CalculationRequestDTO = {
        productId: 'prod_invalid',
        requestedPieces: [{ width: 100, height: 100 }],
      };

      await expect(serviceNotFound.calculate(request)).rejects.toThrow(ProductNotFoundException);
    });

    test('should calculate waste percentage correctly', async () => {
      const request: CalculationRequestDTO = {
        productId: 'prod_1',
        requestedPieces: [{ width: 100, height: 100 }], // 1 m²
      };

      const response = await service.calculate(request);

      // 1 m² needed, 0.2 boards purchased (1.2 m² available) -> waste ~= 16.67%
      expect(response.calculation.wastePercentage).toBeCloseTo(16.67, 1);
    });

    test('should preserve requested pieces in response', async () => {
      const pieces = [
        { width: 150, height: 100 },
        { width: 200, height: 200 },
      ];

      const request: CalculationRequestDTO = {
        productId: 'prod_1',
        requestedPieces: pieces,
      };

      const response = await service.calculate(request);

      expect(response.requestedPieces).toEqual(pieces);
    });

    test('should set calculatedAt timestamp', async () => {
      const request: CalculationRequestDTO = {
        productId: 'prod_1',
        requestedPieces: [{ width: 100, height: 100 }],
      };

      const beforeCall = new Date();
      const response = await service.calculate(request);
      const afterCall = new Date();

      const calculatedTime = new Date(response.metadata.calculatedAt);
      expect(calculatedTime.getTime()).toBeGreaterThanOrEqual(beforeCall.getTime());
      expect(calculatedTime.getTime()).toBeLessThanOrEqual(afterCall.getTime());
    });
  });

  describe('getCalculation()', () => {
    test('should fetch and return calculation', async () => {
      const mockEntity: CalculationRecord = {
        id: 'calc_1',
        productId: 'prod_1',
        requestedPieces: [{ width: 100, height: 100 }],
        totalAreaNeeded: 1,
        boardsUsed: 0.2,
        pricePerBoard: 100,
        totalPrice: 20,
        status: 'COMPLETED',
        createdAt: new Date(),
        product: {
          id: 'prod_1',
          name: 'Test Product',
          standardWidth: 300,
          standardHeight: 200,
          thickness: 18,
          category: { name: 'Test Category' },
        },
      };

      (mockCalculationRepo.findById as jest.Mock).mockResolvedValue(mockEntity);

      const response = await service.getCalculation('calc_1');

      expect(response.id).toBe('calc_1');
      expect(response.product.name).toBe('Test Product');
    });

    test('should throw CalculationNotFoundException if calculation not found', async () => {
      (mockCalculationRepo.findById as jest.Mock).mockResolvedValue(null);

      await expect(service.getCalculation('calc_invalid')).rejects.toThrow(
        CalculationNotFoundException
      );
    });
  });

  describe('listUserCalculations()', () => {
    test('should fetch calculations for user', async () => {
      const baseEntity: Omit<CalculationRecord, 'id' | 'status'> = {
        productId: 'prod_1',
        requestedPieces: [{ width: 100, height: 100 }],
        totalAreaNeeded: 1,
        boardsUsed: 1,
        pricePerBoard: 100,
        totalPrice: 100,
        createdAt: new Date(),
        product: {
          id: 'prod_1',
          name: 'Test',
          standardWidth: 300,
          standardHeight: 200,
          thickness: 18,
          category: { name: 'Test' },
        },
      };

      const mockCalcs: CalculationRecord[] = [
        { ...baseEntity, id: 'calc_1', status: 'DRAFT' },
        { ...baseEntity, id: 'calc_2', status: 'COMPLETED' },
      ];

      (mockCalculationRepo.findByUserId as jest.Mock).mockResolvedValue(mockCalcs);

      const response = await service.listUserCalculations('user_1');

      expect(response.length).toBe(2);
      expect(response[0].id).toBe('calc_1');
    });
  });

  describe('updateCalculation()', () => {
    const existingEntity: CalculationRecord = {
      id: 'calc_1',
      productId: 'prod_1',
      requestedPieces: [{ width: 100, height: 100 }],
      totalAreaNeeded: 1,
      boardsUsed: 0.2,
      pricePerBoard: 100,
      totalPrice: 20,
      status: 'DRAFT',
      createdAt: new Date(),
      product: {
        id: 'prod_1',
        name: 'Test Product',
        standardWidth: 300,
        standardHeight: 200,
        thickness: 18,
        category: { name: 'Test Category' },
      },
    };

    test('should recompute area/boards/price from the new pieces, not trust raw totals', async () => {
      (mockCalculationRepo.findById as jest.Mock).mockResolvedValue(existingEntity);
      (mockCalculationRepo.update as jest.Mock).mockImplementation((_id, data) =>
        Promise.resolve({ ...existingEntity, ...data })
      );

      const newPieces = [
        { width: 200, height: 100 },
        { width: 200, height: 100 },
      ]; // 4 m² on a 6 m² board -> 0.7 boards

      const response = await service.updateCalculation('calc_1', newPieces);

      expect(mockCalculationRepo.update).toHaveBeenCalledWith(
        'calc_1',
        expect.objectContaining({
          requestedPieces: newPieces,
          totalAreaNeeded: 4,
          boardsUsed: 0.7,
          totalPrice: 70, // 0.7 x pricePerBoard(100)
        })
      );
      expect(response.requestedPieces).toEqual(newPieces);
    });

    test('should throw CalculationNotFoundException if the calculation does not exist', async () => {
      (mockCalculationRepo.findById as jest.Mock).mockResolvedValue(null);

      await expect(
        service.updateCalculation('calc_missing', [{ width: 100, height: 100 }])
      ).rejects.toThrow(CalculationNotFoundException);
      expect(mockCalculationRepo.update).not.toHaveBeenCalled();
    });

    test('should propagate InvalidCalculationStatusException from the repository', async () => {
      (mockCalculationRepo.findById as jest.Mock).mockResolvedValue(existingEntity);
      (mockCalculationRepo.update as jest.Mock).mockRejectedValue(
        new InvalidCalculationStatusException('COMPLETED', 'update')
      );

      await expect(
        service.updateCalculation('calc_1', [{ width: 100, height: 100 }])
      ).rejects.toThrow(InvalidCalculationStatusException);
    });
  });

  describe('deleteCalculation()', () => {
    test('should delegate to the repository', async () => {
      await service.deleteCalculation('calc_1');
      expect(mockCalculationRepo.delete).toHaveBeenCalledWith('calc_1');
    });

    test('should propagate CalculationNotFoundException from the repository', async () => {
      (mockCalculationRepo.delete as jest.Mock).mockRejectedValue(
        new CalculationNotFoundException('calc_missing')
      );

      await expect(service.deleteCalculation('calc_missing')).rejects.toThrow(
        CalculationNotFoundException
      );
    });

    test('should propagate InvalidCalculationStatusException from the repository', async () => {
      (mockCalculationRepo.delete as jest.Mock).mockRejectedValue(
        new InvalidCalculationStatusException('SUBMITTED', 'delete')
      );

      await expect(service.deleteCalculation('calc_1')).rejects.toThrow(
        InvalidCalculationStatusException
      );
    });
  });
});
