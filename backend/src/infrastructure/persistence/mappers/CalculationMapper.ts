import { Prisma } from '@prisma/client';
import { CalculationRecord } from '../../../application/ports/out/CalculationPersistence';

type CalculationWithProduct = Prisma.CalculationGetPayload<{
  include: { product: { include: { category: true } } };
}>;

/**
 * Maps Prisma <-> CalculationRecord (the ports/out contract). Deliberately
 * does NOT compute wastePercentage/pieceCount/averagePieceSize — those are
 * application-layer derivations that already exist in
 * CalculationApplicationService.mapToDTOFromEntity()/calculateWaste().
 * Recomputing them here would duplicate that logic into the wrong layer.
 */
export class CalculationMapper {
  static toDomain(calculation: CalculationWithProduct): CalculationRecord {
    return {
      id: calculation.id,
      productId: calculation.productId,
      requestedPieces: calculation.requestedPieces as unknown as Array<{ width: number; height: number }>,
      totalAreaNeeded: Number(calculation.totalAreaNeeded),
      boardsUsed: Number(calculation.boardsUsed),
      pricePerBoard: Number(calculation.pricePerBoard),
      totalPrice: Number(calculation.totalPrice),
      status: calculation.status as CalculationRecord['status'],
      userId: calculation.userId,
      createdAt: calculation.createdAt,
      expiresAt: calculation.expiresAt,
      product: {
        id: calculation.product.id,
        name: calculation.product.name,
        standardWidth: calculation.product.standardWidth,
        standardHeight: calculation.product.standardHeight,
        thickness: calculation.product.thickness,
        category: {
          name: calculation.product.category.name,
        },
      },
    };
  }

  static toDomainArray(calculations: CalculationWithProduct[]): CalculationRecord[] {
    return calculations.map((c) => this.toDomain(c));
  }

  /**
   * Shapes application data for Prisma's create() — flat FKs, so the
   * Unchecked input. Takes Partial<CalculationRecord> to match
   * ICalculationRepository.save()'s parameter type exactly; productId/
   * requestedPieces/etc. are asserted present because creating a
   * calculation without them isn't a real scenario the caller produces
   * (CalculationApplicationService always builds a full object here).
   */
  static toPersistence(data: Partial<CalculationRecord>): Prisma.CalculationUncheckedCreateInput {
    return {
      ...(data.id && { id: data.id }),
      productId: data.productId!,
      requestedPieces: data.requestedPieces!,
      totalAreaNeeded: data.totalAreaNeeded!,
      boardsUsed: data.boardsUsed!,
      pricePerBoard: data.pricePerBoard!,
      totalPrice: data.totalPrice!,
      status: data.status ?? 'DRAFT',
      userId: data.userId ?? null,
      expiresAt: data.expiresAt ?? null,
    };
  }
}
