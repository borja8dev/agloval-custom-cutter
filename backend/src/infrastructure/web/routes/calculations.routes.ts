import { Router } from 'express';
import { CalculationController } from '../controllers/CalculationController';
import { validateRequest } from '../middleware/validation';
import { CalculationRequestSchema } from '../../../application/validation/CalculationSchemas';

export function createCalculationRoutes(controller: CalculationController): Router {
  const router = Router();

  // POST /api/calculations — create a calculation, 201 with pricing
  router.post('/', validateRequest(CalculationRequestSchema), controller.createCalculation);

  // GET /api/calculations/:id — 200, or 404 if not found
  router.get('/:id', controller.getCalculation);

  // GET /api/calculations — authenticated user's calculations (?limit=)
  router.get('/', controller.listCalculations);

  // PUT /api/calculations/:id — coming soon
  router.put('/:id', controller.updateCalculation);

  // DELETE /api/calculations/:id — coming soon
  router.delete('/:id', controller.deleteCalculation);

  return router;
}
