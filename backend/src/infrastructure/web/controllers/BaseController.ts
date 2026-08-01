import { Request, Response } from 'express';

/**
 * Common response helpers for controllers.
 *
 * req is passed explicitly into ok()/error() rather than stored as instance
 * state: controllers are instantiated once and shared across every request,
 * so storing `this.request` would let one in-flight request's data get
 * overwritten by another before its await resolves.
 */
export abstract class BaseController {
  protected ok<T>(req: Request, res: Response, data: T, statusCode: number = 200): Response {
    return res.status(statusCode).json({
      success: true,
      data,
      timestamp: new Date().toISOString(),
      requestId: req.requestId,
    });
  }

  protected error(
    req: Request,
    res: Response,
    code: string,
    message: string,
    statusCode: number = 400,
    details?: unknown
  ): Response {
    return res.status(statusCode).json({
      success: false,
      error: {
        code,
        message,
        ...(details !== undefined && { details }),
      },
      timestamp: new Date().toISOString(),
      requestId: req.requestId,
    });
  }
}
