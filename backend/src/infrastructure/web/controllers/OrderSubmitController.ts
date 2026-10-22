import { Request, Response } from 'express';
import { BaseController } from './BaseController';
import { IOrderSubmitUseCase } from '../../../application/ports/in/OrderSubmitUseCase';
import { OrderSubmitRequestDTO } from '../../../application/dto/OrderSubmit';
import { asyncHandler } from '../middleware/errorHandler';

export class OrderSubmitController extends BaseController {
  constructor(private useCase: IOrderSubmitUseCase) {
    super();
  }

  /** POST /api/orders/submit — re-prices and emails the order, 201. */
  public submit = asyncHandler(async (req: Request, res: Response) => {
    const validatedBody = req.validatedBody as OrderSubmitRequestDTO;
    const response = await this.useCase.submit(validatedBody);
    return this.ok(req, res, response, 201);
  });
}
