import { Router } from 'express';
import { CalculationController } from '../controllers/CalculationController';
import { validateRequest } from '../middleware/validation';
import {
  CalculationRequestSchema,
  CalculationUpdateSchema,
} from '../../../application/validation/CalculationSchemas';

export function createCalculationRoutes(controller: CalculationController): Router {
  const router = Router();

  // POST /api/calculations — create a calculation, 201 with pricing
  router.post('/', validateRequest(CalculationRequestSchema), controller.createCalculation);

  // GET /api/calculations/:id — 200, or 404 if not found
  router.get('/:id', controller.getCalculation);

  // GET /api/calculations — authenticated user's calculations (?limit=)
  router.get('/', controller.listCalculations);

  // PUT /api/calculations/:id — recomputes from new pieces, DRAFT only (409 otherwise)
  router.put('/:id', validateRequest(CalculationUpdateSchema), controller.updateCalculation);

  // DELETE /api/calculations/:id — 204, DRAFT only (409 otherwise)
  router.delete('/:id', controller.deleteCalculation);

  return router;
}
