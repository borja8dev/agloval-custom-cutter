import { Router } from 'express';
import { ProductController } from '../controllers/ProductController';
import { validateQuery } from '../middleware/validation';
import { ProductFilterQuerySchema } from '../../../application/validation/ProductSchemas';

export function createProductRoutes(controller: ProductController): Router {
  const router = Router();
  const filters = validateQuery(ProductFilterQuerySchema);

  // GET /api/products — list with pagination (?limit=&skip=) and filters (?family=&unit=)
  router.get('/', filters, controller.getAll);

  // GET /api/products/search?q=... — must be registered before /:id, or
  // Express matches "search" as the :id param and this handler never runs.
  router.get('/search', filters, controller.search);

  // GET /api/products/:id — 200, or 404 if not found
  router.get('/:id', controller.getById);

  return router;
}

export function createFamilyRoutes(controller: ProductController): Router {
  const router = Router();

  // GET /api/families — every family with per-unit product counts
  router.get('/', controller.listFamilies);

  return router;
}
