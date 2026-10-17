import { Request, Response } from 'express';
import { BaseController } from './BaseController';
import { IOrderQuoteUseCase } from '../../../application/ports/in/OrderQuoteUseCase';
import { OrderQuoteRequestDTO } from '../../../application/dto/OrderQuote';
import { asyncHandler } from '../middleware/errorHandler';

export class OrderQuoteController extends BaseController {
  constructor(private useCase: IOrderQuoteUseCase) {
    super();
  }

  /** POST /api/orders/quote — stateless, 200 (nothing is created). */
  public quote = asyncHandler(async (req: Request, res: Response) => {
    const validatedBody = req.validatedBody as OrderQuoteRequestDTO;
    const response = await this.useCase.quote(validatedBody);
    return this.ok(req, res, response, 200);
  });
}
