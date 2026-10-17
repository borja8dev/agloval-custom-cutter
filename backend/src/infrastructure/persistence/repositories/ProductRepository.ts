import { Prisma, PrismaClient } from '@prisma/client';
import { ProductMapper } from '../mappers/ProductMapper';
import {
  FamilySummary,
  IProductRepository,
  ProductFilter,
  ProductRecord,
  ProductUnit,
} from '../../../application/ports/out/CalculationPersistence';

/** createdAt alone can tie (bulk imports); sku makes every page stable. */
const PRODUCT_ORDER: Prisma.ProductOrderByWithRelationInput[] = [
  { createdAt: 'desc' },
  { sku: 'asc' },
];

function filterToWhere(filter?: ProductFilter): Prisma.ProductWhereInput {
  return {
    ...(filter?.familyCode !== undefined && { category: { code: filter.familyCode } }),
    ...(filter?.unit !== undefined && { unit: filter.unit }),
  };
}

function searchToWhere(query: string, filter?: ProductFilter): Prisma.ProductWhereInput {
  return {
    AND: [
      {
        OR: [
          { name: { contains: query, mode: 'insensitive' } },
          { description: { contains: query, mode: 'insensitive' } },
        ],
      },
      filterToWhere(filter),
    ],
  };
}

export class ProductRepository implements IProductRepository {
  constructor(private prisma: PrismaClient) {}

  async findById(productId: string): Promise<ProductRecord | null> {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      include: { category: true },
    });

    return product ? ProductMapper.toDomain(product) : null;
  }

  async findAll(
    limit: number = 50,
    skip: number = 0,
    filter?: ProductFilter
  ): Promise<ProductRecord[]> {
    const products = await this.prisma.product.findMany({
      where: filterToWhere(filter),
      take: limit,
      skip,
      include: { category: true },
      orderBy: PRODUCT_ORDER,
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
      orderBy: PRODUCT_ORDER,
      take: limit,
      skip,
    });

    return ProductMapper.toDomainArray(products);
  }

  async search(
    query: string,
    limit: number = 50,
    skip: number = 0,
    filter?: ProductFilter
  ): Promise<ProductRecord[]> {
    const products = await this.prisma.product.findMany({
      where: searchToWhere(query, filter),
      include: { category: true },
      orderBy: PRODUCT_ORDER,
      take: limit,
      skip,
    });

    return ProductMapper.toDomainArray(products);
  }

  async count(filter?: ProductFilter): Promise<number> {
    return this.prisma.product.count({ where: filterToWhere(filter) });
  }

  async countSearch(query: string, filter?: ProductFilter): Promise<number> {
    return this.prisma.product.count({ where: searchToWhere(query, filter) });
  }

  /** Two queries (families + one groupBy), independent of the number of families. */
  async listFamilies(): Promise<FamilySummary[]> {
    const [categories, groups] = await Promise.all([
      this.prisma.category.findMany({
        select: { id: true, code: true, name: true },
        orderBy: { code: 'asc' },
      }),
      this.prisma.product.groupBy({
        by: ['categoryId', 'unit'],
        _count: { _all: true },
      }),
    ]);

    const unitsByCategory = new Map<string, Record<ProductUnit, number>>();
    for (const group of groups) {
      const units = unitsByCategory.get(group.categoryId) ?? { UD: 0, M2: 0, ML: 0 };
      units[group.unit as ProductUnit] = group._count._all;
      unitsByCategory.set(group.categoryId, units);
    }

    return categories.map((category) => {
      const units = unitsByCategory.get(category.id) ?? { UD: 0, M2: 0, ML: 0 };
      return {
        code: category.code,
        name: category.name,
        productCount: units.UD + units.M2 + units.ML,
        units,
      };
    });
  }
}
