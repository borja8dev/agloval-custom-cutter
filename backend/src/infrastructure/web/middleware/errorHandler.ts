import { Request, Response, NextFunction } from 'express';
import { DomainException } from '../../../domain/exceptions/DomainException';

interface ErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
  timestamp: string;
  requestId: string;
}

/**
 * Global error handler. Must be the LAST middleware registered — Express
 * only routes to a 4-arg middleware when something upstream throws or
 * calls next(error).
 */
export function errorHandler(err: Error | DomainException, req: Request, res: Response, _next: NextFunction): void {
  const requestId = req.requestId ?? 'unknown';
  const timestamp = new Date().toISOString();

  console.error(`[${requestId}] Error:`, {
    name: err.name,
    message: err.message,
    stack: err.stack,
    url: req.originalUrl,
    method: req.method,
  });

  if (err instanceof DomainException) {
    const response: ErrorResponse = {
      success: false,
      error: {
        code: err.code,
        message: err.message,
      },
      timestamp,
      requestId,
    };

    res.status(err.statusCode).json(response);
    return;
  }

  const response: ErrorResponse = {
    success: false,
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message:
        process.env.NODE_ENV === 'development' ? err.message : 'An unexpected error occurred. Please try again later.',
    },
    timestamp,
    requestId,
  };

  res.status(500).json(response);
}

/**
 * Wraps an async route handler so rejected promises reach errorHandler —
 * Express doesn't catch async/await rejections on its own.
 */
export function asyncHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
