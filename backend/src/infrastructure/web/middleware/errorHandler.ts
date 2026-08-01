import { Request, Response, NextFunction } from 'express';
import { Prisma } from '@prisma/client';
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
 * Maps Prisma's known request-error codes to an HTTP status/code. Message
 * is always a fixed, generic string — Prisma's own message can include
 * internal field/table names and shouldn't reach a client, even in dev.
 */
function mapPrismaError(err: Prisma.PrismaClientKnownRequestError): {
  statusCode: number;
  code: string;
  message: string;
} {
  switch (err.code) {
    case 'P2002':
      return {
        statusCode: 409,
        code: 'DUPLICATE_ENTRY',
        message: 'A record with this value already exists',
      };
    case 'P2003':
    case 'P2025':
      return {
        statusCode: 404,
        code: 'RECORD_NOT_FOUND',
        message: 'The referenced record was not found',
      };
    default:
      return { statusCode: 400, code: 'INVALID_DATA', message: 'Invalid data provided' };
  }
}

/**
 * Global error handler. Must be the LAST middleware registered — Express
 * only routes to a 4-arg middleware when something upstream throws or
 * calls next(error).
 */
export function errorHandler(
  err: Error | DomainException,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
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

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    const mapped = mapPrismaError(err);
    const response: ErrorResponse = {
      success: false,
      error: {
        code: mapped.code,
        message: mapped.message,
      },
      timestamp,
      requestId,
    };

    res.status(mapped.statusCode).json(response);
    return;
  }

  const response: ErrorResponse = {
    success: false,
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message:
        process.env.NODE_ENV === 'development'
          ? err.message
          : 'An unexpected error occurred. Please try again later.',
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
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>
) {
  return (req: Request, res: Response, next: NextFunction): void => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
