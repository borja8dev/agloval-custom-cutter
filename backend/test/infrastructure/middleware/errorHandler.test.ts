import { Request, Response } from 'express';
import { errorHandler } from '../../../src/infrastructure/web/middleware/errorHandler';
import { InvalidPieceException } from '../../../src/domain/exceptions/DomainException';

describe('Error Handler Middleware', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;

  beforeEach(() => {
    mockReq = {
      originalUrl: '/api/test',
      method: 'POST',
      requestId: 'req_1',
    };

    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
  });

  test('should handle domain exceptions with correct status code', () => {
    const err = new InvalidPieceException({ width: 500 }, 'Exceeds board width');

    errorHandler(err, mockReq as Request, mockRes as Response, jest.fn());

    expect(mockRes.status).toHaveBeenCalledWith(400);
    expect(mockRes.json).toHaveBeenCalled();

    const response = (mockRes.json as jest.Mock).mock.calls[0][0];
    expect(response.success).toBe(false);
    expect(response.error.code).toBe('INVALID_PIECE');
    expect(response.requestId).toBe('req_1');
  });

  test('should handle generic errors as 500', () => {
    const err = new Error('Something went wrong');

    errorHandler(err, mockReq as Request, mockRes as Response, jest.fn());

    expect(mockRes.status).toHaveBeenCalledWith(500);
  });

  test('should not expose stack trace in production', () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';

    const err = new Error('Secret details');

    errorHandler(err, mockReq as Request, mockRes as Response, jest.fn());

    const response = (mockRes.json as jest.Mock).mock.calls[0][0];
    expect(response.error.message).not.toContain('Secret');

    process.env.NODE_ENV = originalEnv;
  });

  test('should fall back to "unknown" requestId when absent', () => {
    const reqWithoutId: Partial<Request> = { originalUrl: '/api/test', method: 'GET' };
    const err = new Error('boom');

    errorHandler(err, reqWithoutId as Request, mockRes as Response, jest.fn());

    const response = (mockRes.json as jest.Mock).mock.calls[0][0];
    expect(response.requestId).toBe('unknown');
  });
});
