import { RequestHandler, Router } from 'express';
import { QuoteSubmitController } from '../controllers/QuoteSubmitController';
import { validateRequest } from '../middleware/validation';
import { QuoteSubmitRequestSchema } from '../../../application/validation/QuoteSubmitSchemas';

export function createQuoteRoutes(
  submitController: QuoteSubmitController,
  submitRateLimit: RequestHandler
): Router {
  const router = Router();

  // POST /api/quotes/submit — re-prices the quote and emails it to the customer, 201;
  // shares the per-IP limit with POST /api/orders/submit (invalid requests count too)
  router.post(
    '/submit',
    submitRateLimit,
    validateRequest(QuoteSubmitRequestSchema),
    submitController.submit
  );

  return router;
}
