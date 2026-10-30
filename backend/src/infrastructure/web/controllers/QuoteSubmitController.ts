import { Request, Response } from 'express';
import { BaseController } from './BaseController';
import { IQuoteSubmitUseCase } from '../../../application/ports/in/QuoteSubmitUseCase';
import { QuoteSubmitRequestDTO } from '../../../application/dto/QuoteSubmit';
import { asyncHandler } from '../middleware/errorHandler';

export class QuoteSubmitController extends BaseController {
  constructor(private useCase: IQuoteSubmitUseCase) {
    super();
  }

  /** POST /api/quotes/submit — re-prices the quote and emails it to the customer, 201. */
  public submit = asyncHandler(async (req: Request, res: Response) => {
    const validatedBody = req.validatedBody as QuoteSubmitRequestDTO;
    const response = await this.useCase.submit(validatedBody);
    return this.ok(req, res, response, 201);
  });
}
