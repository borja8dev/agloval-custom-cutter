import { PrismaClient } from '@prisma/client';
import { ProductMapper } from '../mappers/ProductMapper';
import {
  IProductRepository,
  ProductRecord,
} from '../../../application/ports/out/CalculationPersistence';

export class ProductRepository implements IProductRepository {
  constructor(private prisma: PrismaClient) {}

  async findById(productId: string): Promise<ProductRecord | null> {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      include: { category: true },
    });

    return product ? ProductMapper.toDomain(product) : null;
  }

  async findAll(limit: number = 50, skip: number = 0): Promise<ProductRecord[]> {
    const products = await this.prisma.product.findMany({
      take: limit,
      skip,
      include: { category: true },
      orderBy: { createdAt: 'desc' },
    });

    return ProductMapper.toDomainArray(products);
  }

  async findByCategory(
    categoryId: string,
    limit: number = 50,
    skip: number = 0
  ): Promise<ProductRecord[]> {
    const products = await this.prisma.product.findMany({
      where: { categoryId },
      include: { category: true },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip,
    });

    return ProductMapper.toDomainArray(products);
  }

  async search(query: string, limit: number = 50, skip: number = 0): Promise<ProductRecord[]> {
    const products = await this.prisma.product.findMany({
      where: {
        OR: [
          { name: { contains: query, mode: 'insensitive' } },
          { description: { contains: query, mode: 'insensitive' } },
        ],
      },
      include: { category: true },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip,
    });

    return ProductMapper.toDomainArray(products);
  }

  /** Not part of IProductRepository — extra convenience for pagination UI, not consumed yet. */
  async count(): Promise<number> {
    return this.prisma.product.count();
  }
}
