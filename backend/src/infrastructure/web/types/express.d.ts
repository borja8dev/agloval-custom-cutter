import 'express';

declare global {
  namespace Express {
    interface Request {
      requestId?: string;
      validatedBody?: unknown;
      validatedQuery?: unknown;
      validatedParams?: unknown;
      userId?: string;
    }
  }
}
