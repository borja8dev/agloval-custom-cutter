import { Request, Response } from 'express';
import { BaseController } from './BaseController';
import { IProductUseCase } from '../../../application/ports/in/ProductUseCase';
import { asyncHandler } from '../middleware/errorHandler';

export class ProductController extends BaseController {
  constructor(private useCase: IProductUseCase) {
    super();
  }

  /** GET /api/products */
  public getAll = asyncHandler(async (req: Request, res: Response) => {
    const limit = parseInt(req.query.limit as string, 10) || 50;
    const products = await this.useCase.getAll(limit);

    return this.ok(req, res, { products, count: products.length });
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

  /** GET /api/products/search?q=melamina */
  public search = asyncHandler(async (req: Request, res: Response) => {
    const query = req.query.q as string;
    if (!query || query.length < 2) {
      return this.error(req, res, 'INVALID_QUERY', 'Search query must be at least 2 characters', 400);
    }

    const products = await this.useCase.search(query);
    return this.ok(req, res, { products, count: products.length });
  });
}
