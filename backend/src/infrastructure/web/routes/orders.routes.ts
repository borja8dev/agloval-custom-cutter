import { Router } from 'express';
import { OrderQuoteController } from '../controllers/OrderQuoteController';
import { validateRequest } from '../middleware/validation';
import { OrderQuoteRequestSchema } from '../../../application/validation/OrderQuoteSchemas';

export function createOrderRoutes(controller: OrderQuoteController): Router {
  const router = Router();

  // POST /api/orders/quote — prices a multi-product order, 200; nothing is persisted
  router.post('/quote', validateRequest(OrderQuoteRequestSchema), controller.quote);

  return router;
}
