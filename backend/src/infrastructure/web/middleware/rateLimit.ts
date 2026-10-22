import { NextFunction, Request, RequestHandler, Response } from 'express';

export interface RateLimitOptions {
  /** Requests allowed per IP within one window. */
  max: number;
  windowMs: number;
}

export const DEFAULT_SUBMIT_RATE_LIMIT: RateLimitOptions = { max: 5, windowMs: 10 * 60_000 };

/** Above this many tracked IPs, expired entries are swept before adding a new one. */
const SWEEP_THRESHOLD = 1_000;

interface Window {
  count: number;
  resetAt: number;
}

/**
 * Small in-memory fixed-window limiter per client IP. State lives in this
 * process only, which is enough for a single instance; several instances
 * would each count on their own.
 */
export function createRateLimit(
  options: RateLimitOptions = DEFAULT_SUBMIT_RATE_LIMIT
): RequestHandler {
  const windows = new Map<string, Window>();

  const sweep = (now: number): void => {
    for (const [ip, window] of windows) {
      if (window.resetAt <= now) windows.delete(ip);
    }
  };

  return (req: Request, res: Response, next: NextFunction): void => {
    const now = Date.now();
    const ip = req.ip ?? 'unknown';
    let window = windows.get(ip);

    if (!window || window.resetAt <= now) {
      if (windows.size >= SWEEP_THRESHOLD) sweep(now);
      window = { count: 0, resetAt: now + options.windowMs };
      windows.set(ip, window);
    }

    window.count += 1;
    if (window.count <= options.max) {
      next();
      return;
    }

    res.setHeader('Retry-After', String(Math.ceil((window.resetAt - now) / 1000)));
    res.status(429).json({
      success: false,
      error: {
        code: 'TOO_MANY_REQUESTS',
        message: 'Demasiados envíos seguidos. Inténtalo de nuevo más tarde.',
      },
      timestamp: new Date(now).toISOString(),
      requestId: req.requestId,
    });
  };
}
