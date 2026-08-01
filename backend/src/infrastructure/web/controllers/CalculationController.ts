import { Request, Response } from 'express';
import { BaseController } from './BaseController';
import { ICalculateUseCase } from '../../../application/ports/in/CalculateUseCase';
import { CalculationRequestDTO } from '../../../application/dto/CalculationRequest';
import { CalculationUpdateInput } from '../../../application/validation/CalculationSchemas';
import { asyncHandler } from '../middleware/errorHandler';

export class CalculationController extends BaseController {
  constructor(private useCase: ICalculateUseCase) {
    super();
  }

  /** POST /api/calculations */
  public createCalculation = asyncHandler(async (req: Request, res: Response) => {
    const validatedBody = req.validatedBody as CalculationRequestDTO;
    const response = await this.useCase.calculate(validatedBody);
    return this.ok(req, res, response, 201);
  });

  /** GET /api/calculations/:id */
  public getCalculation = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    if (!id) {
      return this.error(req, res, 'MISSING_ID', 'Calculation ID is required', 400);
    }

    const response = await this.useCase.getCalculation(id);
    return this.ok(req, res, response, 200);
  });

  /** GET /api/calculations (requires auth) */
  public listCalculations = asyncHandler(async (req: Request, res: Response) => {
    const { userId } = req;
    if (!userId) {
      return this.error(req, res, 'UNAUTHORIZED', 'Authentication required', 401);
    }

    const limit = parseInt(req.query.limit as string, 10) || 50;
    const response = await this.useCase.listUserCalculations(userId, limit);
    return this.ok(req, res, response, 200);
  });

  /** PUT /api/calculations/:id (only DRAFT status) */
  public updateCalculation = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    if (!id) {
      return this.error(req, res, 'MISSING_ID', 'Calculation ID is required', 400);
    }

    const { requestedPieces } = req.validatedBody as CalculationUpdateInput;
    const response = await this.useCase.updateCalculation(id, requestedPieces);
    return this.ok(req, res, response, 200);
  });

  /** DELETE /api/calculations/:id (only DRAFT status) */
  public deleteCalculation = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    if (!id) {
      return this.error(req, res, 'MISSING_ID', 'Calculation ID is required', 400);
    }

    await this.useCase.deleteCalculation(id);
    return res.status(204).end();
  });
}
