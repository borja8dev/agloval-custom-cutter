import { PrismaClient } from '@prisma/client';
import { CalculationMapper } from '../mappers/CalculationMapper';
import {
  ICalculationRepository,
  CalculationRecord,
} from '../../../application/ports/out/CalculationPersistence';
import {
  CalculationNotFoundException,
  InvalidCalculationStatusException,
} from '../../../application/exceptions/ApplicationException';

const withProduct = {
  product: { include: { category: true } },
} as const;

export class CalculationRepository implements ICalculationRepository {
  constructor(private prisma: PrismaClient) {}

  async save(calculation: Partial<CalculationRecord>): Promise<CalculationRecord> {
    const created = await this.prisma.calculation.create({
      data: CalculationMapper.toPersistence(calculation),
      include: withProduct,
    });

    return CalculationMapper.toDomain(created);
  }

  async findById(id: string): Promise<CalculationRecord | null> {
    const calculation = await this.prisma.calculation.findUnique({
      where: { id },
      include: withProduct,
    });

    return calculation ? CalculationMapper.toDomain(calculation) : null;
  }

  async findByUserId(
    userId: string,
    limit: number = 50,
    skip: number = 0
  ): Promise<CalculationRecord[]> {
    const calculations = await this.prisma.calculation.findMany({
      where: { userId },
      include: withProduct,
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip,
    });

    return CalculationMapper.toDomainArray(calculations);
  }

  /** Only DRAFT calculations may be modified. */
  async update(id: string, data: Partial<CalculationRecord>): Promise<CalculationRecord> {
    const current = await this.prisma.calculation.findUnique({ where: { id } });
    if (!current) {
      throw new CalculationNotFoundException(id);
    }
    if (current.status !== 'DRAFT') {
      throw new InvalidCalculationStatusException(current.status, 'update');
    }

    const updated = await this.prisma.calculation.update({
      where: { id },
      data: {
        ...(data.requestedPieces !== undefined && { requestedPieces: data.requestedPieces }),
        ...(data.totalAreaNeeded !== undefined && { totalAreaNeeded: data.totalAreaNeeded }),
        ...(data.boardsUsed !== undefined && { boardsUsed: data.boardsUsed }),
        ...(data.totalPrice !== undefined && { totalPrice: data.totalPrice }),
      },
      include: withProduct,
    });

    return CalculationMapper.toDomain(updated);
  }

  /** Only DRAFT calculations may be deleted. */
  async delete(id: string): Promise<void> {
    const current = await this.prisma.calculation.findUnique({ where: { id } });
    if (!current) {
      throw new CalculationNotFoundException(id);
    }
    if (current.status !== 'DRAFT') {
      throw new InvalidCalculationStatusException(current.status, 'delete');
    }

    await this.prisma.calculation.delete({ where: { id } });
  }

  /** Not part of ICalculationRepository — extra convenience, not consumed yet. */
  async countByStatus(status: CalculationRecord['status']): Promise<number> {
    return this.prisma.calculation.count({ where: { status } });
  }
}
