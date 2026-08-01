import { Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import { errorHandler } from '../../../src/infrastructure/web/middleware/errorHandler';
import { InvalidPieceException } from '../../../src/domain/exceptions/DomainException';

function prismaError(code: string): Prisma.PrismaClientKnownRequestError {
  return new Prisma.PrismaClientKnownRequestError(
    'Internal Prisma message with field/table names',
    {
      code,
      clientVersion: '5.0.0',
    }
  );
}

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

  describe('Prisma error translation', () => {
    test('P2002 (unique constraint) -> 409', () => {
      errorHandler(prismaError('P2002'), mockReq as Request, mockRes as Response, jest.fn());

      expect(mockRes.status).toHaveBeenCalledWith(409);
      const response = (mockRes.json as jest.Mock).mock.calls[0][0];
      expect(response.error.code).toBe('DUPLICATE_ENTRY');
    });

    test('P2003 (foreign key violation) -> 404', () => {
      errorHandler(prismaError('P2003'), mockReq as Request, mockRes as Response, jest.fn());

      expect(mockRes.status).toHaveBeenCalledWith(404);
      const response = (mockRes.json as jest.Mock).mock.calls[0][0];
      expect(response.error.code).toBe('RECORD_NOT_FOUND');
    });

    test('P2025 (record not found) -> 404', () => {
      errorHandler(prismaError('P2025'), mockReq as Request, mockRes as Response, jest.fn());

      expect(mockRes.status).toHaveBeenCalledWith(404);
    });

    test('unmapped Prisma error code -> 400, generic message', () => {
      errorHandler(prismaError('P2014'), mockReq as Request, mockRes as Response, jest.fn());

      expect(mockRes.status).toHaveBeenCalledWith(400);
      const response = (mockRes.json as jest.Mock).mock.calls[0][0];
      expect(response.error.code).toBe('INVALID_DATA');
    });

    test('never leaks the raw Prisma message, even in development', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      errorHandler(prismaError('P2002'), mockReq as Request, mockRes as Response, jest.fn());

      const response = (mockRes.json as jest.Mock).mock.calls[0][0];
      expect(response.error.message).not.toContain('field/table names');

      process.env.NODE_ENV = originalEnv;
    });
  });
});
