import { ICalculateUseCase } from '../ports/in/CalculateUseCase';
import { IProductRepository, ICalculationRepository, CalculationRecord } from '../ports/out/CalculationPersistence';
import { CalculationRequestDTO } from '../dto/CalculationRequest';
import { CalculationResponseDTO } from '../dto/CalculationResponse';
import { CuttingCalculator } from '../../domain/services/CuttingCalculator';
import { ProductNotFoundException, CalculationNotFoundException } from '../exceptions/ApplicationException';

/**
 * Implements ICalculateUseCase. Orchestrates the domain service and the
 * persistence ports — no business logic here, that lives in CuttingCalculator.
 */
export class CalculationApplicationService implements ICalculateUseCase {
  constructor(
    private productRepository: IProductRepository,
    private calculationRepository: ICalculationRepository
  ) {}

  async calculate(request: CalculationRequestDTO): Promise<CalculationResponseDTO> {
    const product = await this.productRepository.findById(request.productId);
    if (!product) {
      throw new ProductNotFoundException(request.productId);
    }

    const calculator = new CuttingCalculator({
      width: product.standardWidth,
      height: product.standardHeight,
      thickness: product.thickness,
    });

    const calculationResult = calculator.calculate(request.requestedPieces);
    const totalPrice = calculationResult.boardsNeeded * product.pricePerUnit;

    // Quotes are valid 30 days — a business rule, decided here (application
    // layer), not buried in the persistence mapper.
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    const saved = await this.calculationRepository.save({
      productId: product.id,
      requestedPieces: request.requestedPieces,
      totalAreaNeeded: calculationResult.totalAreaNeeded,
      boardsUsed: calculationResult.boardsNeeded,
      pricePerBoard: product.pricePerUnit,
      totalPrice,
      userId: request.userId,
      status: 'DRAFT',
      expiresAt,
    });

    return this.mapToDTOFromEntity(saved);
  }

  async getCalculation(calculationId: string): Promise<CalculationResponseDTO> {
    const calculation = await this.calculationRepository.findById(calculationId);
    if (!calculation) {
      throw new CalculationNotFoundException(calculationId);
    }
    return this.mapToDTOFromEntity(calculation);
  }

  async listUserCalculations(userId: string, limit: number = 50): Promise<CalculationResponseDTO[]> {
    const calculations = await this.calculationRepository.findByUserId(userId, limit);
    return calculations.map((c) => this.mapToDTOFromEntity(c));
  }

  private mapToDTOFromEntity(entity: CalculationRecord): CalculationResponseDTO {
    const boardArea = (entity.product.standardWidth * entity.product.standardHeight) / 10000;

    return {
      id: entity.id,
      product: {
        id: entity.product.id,
        name: entity.product.name,
        categoryName: entity.product.category.name,
      },
      board: {
        width: entity.product.standardWidth,
        height: entity.product.standardHeight,
        thickness: entity.product.thickness,
        area: boardArea,
      },
      requestedPieces: entity.requestedPieces,
      calculation: {
        totalAreaNeeded: entity.totalAreaNeeded,
        boardsNeeded: entity.boardsUsed,
        wastePercentage: this.calculateWaste(entity.totalAreaNeeded, entity.boardsUsed, boardArea),
        pieceCount: entity.requestedPieces.length,
        averagePieceSize: entity.totalAreaNeeded / entity.requestedPieces.length,
      },
      pricing: {
        pricePerBoard: entity.pricePerBoard,
        boardsNeeded: entity.boardsUsed,
        totalPrice: entity.totalPrice,
        currency: 'EUR',
      },
      metadata: {
        calculatedAt: entity.createdAt.toISOString(),
        validUntilDays: entity.expiresAt
          ? Math.ceil((entity.expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
          : undefined,
        status: entity.status,
      },
    };
  }

  private calculateWaste(totalAreaNeeded: number, boardsUsed: number, boardArea: number): number {
    if (boardsUsed === 0) return 0;
    const usedArea = boardsUsed * boardArea;
    const waste = usedArea - totalAreaNeeded;
    return (waste / usedArea) * 100;
  }
}
