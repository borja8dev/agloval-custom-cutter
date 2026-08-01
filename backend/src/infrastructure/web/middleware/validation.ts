import { Request, Response, NextFunction } from 'express';
import { z, ZodSchema, ZodError } from 'zod';

// z.flattenError() is Zod v4's current API — error.flatten() is deprecated.
function respondValidationError(
  res: Response,
  req: Request,
  code: string,
  message: string,
  error: ZodError
): void {
  res.status(400).json({
    success: false,
    error: { code, message, details: z.flattenError(error) },
    timestamp: new Date().toISOString(),
    requestId: req.requestId,
  });
}

/** Usage: router.post('/', validateRequest(SomeSchema), controller.handler) */
export function validateRequest(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body);

    if (!result.success) {
      respondValidationError(
        res,
        req,
        'VALIDATION_ERROR',
        'Request validation failed',
        result.error
      );
      return;
    }

    req.validatedBody = result.data;
    next();
  };
}

export function validateQuery(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.query);

    if (!result.success) {
      respondValidationError(
        res,
        req,
        'QUERY_VALIDATION_ERROR',
        'Query parameters validation failed',
        result.error
      );
      return;
    }

    req.validatedQuery = result.data;
    next();
  };
}

export function validateParams(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.params);

    if (!result.success) {
      respondValidationError(
        res,
        req,
        'PARAMS_VALIDATION_ERROR',
        'URL parameters validation failed',
        result.error
      );
      return;
    }

    req.validatedParams = result.data;
    next();
  };
}
