import { Router } from 'express';
import { ProductController } from '../controllers/ProductController';

export function createProductRoutes(controller: ProductController): Router {
  const router = Router();

  // GET /api/products — list with pagination (?limit=)
  router.get('/', controller.getAll);

  // GET /api/products/search?q=... — must be registered before /:id, or
  // Express matches "search" as the :id param and this handler never runs.
  router.get('/search', controller.search);

  // GET /api/products/:id — 200, or 404 if not found
  router.get('/:id', controller.getById);

  return router;
}
