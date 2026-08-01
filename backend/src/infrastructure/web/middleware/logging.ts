import { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'node:crypto';

/** Attaches a short request ID and logs the request/response pair. */
export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  const requestId = randomUUID().split('-')[0];
  req.requestId = requestId;

  const startTime = Date.now();

  console.log(`[${requestId}] ${req.method} ${req.originalUrl}`);
  if (req.body && Object.keys(req.body).length > 0) {
    console.log(`[${requestId}] Body:`, {
      ...req.body,
      password: undefined,
      token: undefined,
    });
  }

  const originalJson = res.json;
  res.json = function (body: unknown): Response {
    const duration = Date.now() - startTime;
    console.log(`[${requestId}] Response: ${res.statusCode} (${duration}ms)`);
    return originalJson.call(this, body);
  };

  next();
}

/**
 * Sets X-Response-Time by wrapping res.json (not the 'finish' event —
 * that fires after headers are already sent, so setHeader() would throw).
 */
export function responseTime(_req: Request, res: Response, next: NextFunction): void {
  const start = Date.now();
  const originalJson = res.json;

  res.json = function (body: unknown): Response {
    res.setHeader('X-Response-Time', `${Date.now() - start}ms`);
    return originalJson.call(this, body);
  };

  next();
}
