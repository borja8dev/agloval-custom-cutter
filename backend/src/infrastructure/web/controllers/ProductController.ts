import { Request, Response } from 'express';
import { BaseController } from './BaseController';
import { IProductUseCase } from '../../../application/ports/in/ProductUseCase';
import { ProductFilter } from '../../../application/ports/out/CalculationPersistence';
import { ProductFilterQuery } from '../../../application/validation/ProductSchemas';
import { asyncHandler } from '../middleware/errorHandler';

/** Reads the filters validated by validateQuery(ProductFilterQuerySchema). */
function filterFrom(req: Request): ProductFilter {
  const { family, unit } = (req.validatedQuery ?? {}) as ProductFilterQuery;
  return {
    ...(family !== undefined && { familyCode: family }),
    ...(unit !== undefined && { unit }),
  };
}

export class ProductController extends BaseController {
  constructor(private useCase: IProductUseCase) {
    super();
  }

  /** GET /api/families */
  public listFamilies = asyncHandler(async (req: Request, res: Response) => {
    const families = await this.useCase.listFamilies();

    return this.ok(req, res, { families, count: families.length });
  });

  /**
   * GET /api/products?family=&unit=&limit=&skip=
   * `count` is the size of the returned page; `total` is every match of the filter.
   */
  public getAll = asyncHandler(async (req: Request, res: Response) => {
    const limit = parseInt(req.query.limit as string, 10) || 50;
    const skip = parseInt(req.query.skip as string, 10) || 0;
    const filter = filterFrom(req);
    const [products, total] = await Promise.all([
      this.useCase.getAll(limit, skip, filter),
      this.useCase.countAll(filter),
    ]);

    return this.ok(req, res, { products, count: products.length, total });
  });

  /** GET /api/products/:id */
  public getById = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    if (!id) {
      return this.error(req, res, 'MISSING_ID', 'Product ID is required', 400);
    }

    const product = await this.useCase.getById(id);
    if (!product) {
      return this.error(req, res, 'PRODUCT_NOT_FOUND', `Product ${id} not found`, 404);
    }

    return this.ok(req, res, product);
  });

  /** GET /api/products/search?q=melamina&family=&unit= */
  public search = asyncHandler(async (req: Request, res: Response) => {
    const query = req.query.q as string;
    if (!query || query.length < 2) {
      return this.error(
        req,
        res,
        'INVALID_QUERY',
        'Search query must be at least 2 characters',
        400
      );
    }

    const limit = parseInt(req.query.limit as string, 10) || 50;
    const skip = parseInt(req.query.skip as string, 10) || 0;
    const filter = filterFrom(req);
    const [products, total] = await Promise.all([
      this.useCase.search(query, limit, skip, filter),
      this.useCase.countSearch(query, filter),
    ]);
    return this.ok(req, res, { products, count: products.length, total });
  });
}
