import { RequestHandler, Router } from 'express';
import { OrderQuoteController } from '../controllers/OrderQuoteController';
import { OrderSubmitController } from '../controllers/OrderSubmitController';
import { validateRequest } from '../middleware/validation';
import { OrderQuoteRequestSchema } from '../../../application/validation/OrderQuoteSchemas';
import { OrderSubmitRequestSchema } from '../../../application/validation/OrderSubmitSchemas';

export function createOrderRoutes(
  quoteController: OrderQuoteController,
  submitController: OrderSubmitController,
  submitRateLimit: RequestHandler
): Router {
  const router = Router();

  // POST /api/orders/quote — prices a multi-product order, 200; nothing is persisted
  router.post('/quote', validateRequest(OrderQuoteRequestSchema), quoteController.quote);

  // POST /api/orders/submit — re-prices the order and emails it, 201; limited per IP
  // (the limit runs first, so invalid requests count too)
  router.post(
    '/submit',
    submitRateLimit,
    validateRequest(OrderSubmitRequestSchema),
    submitController.submit
  );

  return router;
}
