import { ICalculateUseCase } from '../ports/in/CalculateUseCase';
import {
  IProductRepository,
  ICalculationRepository,
  CalculationRecord,
} from '../ports/out/CalculationPersistence';
import { CalculationRequestDTO } from '../dto/CalculationRequest';
import { CalculationResponseDTO } from '../dto/CalculationResponse';
import { CuttingCalculator } from '../../domain/services/CuttingCalculator';
import { priceWholeBoards } from '../../domain/services/BoardPricing';
import {
  ProductNotFoundException,
  CalculationNotFoundException,
  UnsupportedProductUnitException,
} from '../exceptions/ApplicationException';

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

    if (
      product.unit !== 'M2' ||
      product.standardWidth === null ||
      product.standardHeight === null
    ) {
      throw new UnsupportedProductUnitException(product.id, product.unit);
    }

    const calculator = new CuttingCalculator({
      width: product.standardWidth,
      height: product.standardHeight,
      thickness: product.thickness ?? undefined,
    });

    const calculationResult = calculator.calculate(request.requestedPieces);
    const { pricePerBoard, boardsNeeded, totalPrice } = priceWholeBoards({
      pieces: request.requestedPieces,
      boardAreaM2: (product.standardWidth * product.standardHeight) / 10000,
      pricePerM2: product.pricePerM2,
      pricePerUnit: product.pricePerUnit,
    });

    // Quotes are valid 30 days — a business rule, decided here (application
    // layer), not buried in the persistence mapper.
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    const saved = await this.calculationRepository.save({
      productId: product.id,
      requestedPieces: request.requestedPieces,
      totalAreaNeeded: calculationResult.totalAreaNeeded,
      boardsUsed: boardsNeeded,
      pricePerBoard,
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

  async listUserCalculations(
    userId: string,
    limit: number = 50,
    skip: number = 0
  ): Promise<CalculationResponseDTO[]> {
    const calculations = await this.calculationRepository.findByUserId(userId, limit, skip);
    return calculations.map((c) => this.mapToDTOFromEntity(c));
  }

  async updateCalculation(
    calculationId: string,
    requestedPieces: Array<{ width: number; height: number }>
  ): Promise<CalculationResponseDTO> {
    const existing = await this.calculationRepository.findById(calculationId);
    if (!existing) {
      throw new CalculationNotFoundException(calculationId);
    }

    // Recompute from the domain service — never trust raw totals from a caller.
    const calculator = new CuttingCalculator({
      width: existing.product.standardWidth,
      height: existing.product.standardHeight,
      thickness: existing.product.thickness ?? undefined,
    });

    const calculationResult = calculator.calculate(requestedPieces);
    // A DRAFT update is a re-quote: price again from the product's current
    // prices, so create and update always apply the same formula.
    const { pricePerBoard, boardsNeeded, totalPrice } = priceWholeBoards({
      pieces: requestedPieces,
      boardAreaM2: (existing.product.standardWidth * existing.product.standardHeight) / 10000,
      pricePerM2: existing.product.pricePerM2,
      pricePerUnit: existing.product.pricePerUnit,
    });

    // update() enforces the DRAFT-only rule itself (single source of truth
    // for that invariant); it throws InvalidCalculationStatusException.
    const updated = await this.calculationRepository.update(calculationId, {
      requestedPieces,
      totalAreaNeeded: calculationResult.totalAreaNeeded,
      boardsUsed: boardsNeeded,
      pricePerBoard,
      totalPrice,
    });

    return this.mapToDTOFromEntity(updated);
  }

  async deleteCalculation(calculationId: string): Promise<void> {
    await this.calculationRepository.delete(calculationId);
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
