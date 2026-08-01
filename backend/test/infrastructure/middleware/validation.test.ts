import { Request, Response } from 'express';
import { z } from 'zod';
import {
  validateRequest,
  validateQuery,
  validateParams,
} from '../../../src/infrastructure/web/middleware/validation';

describe('validation middleware', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let next: jest.Mock;

  beforeEach(() => {
    mockReq = { requestId: 'req_1' };
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    next = jest.fn();
  });

  describe('validateRequest', () => {
    const schema = z.object({ name: z.string() });

    test('attaches validatedBody and calls next() on success', () => {
      mockReq.body = { name: 'ok' };
      validateRequest(schema)(mockReq as Request, mockRes as Response, next);

      expect(next).toHaveBeenCalled();
      expect(mockReq.validatedBody).toEqual({ name: 'ok' });
    });

    test('responds 400 and does not call next() on failure', () => {
      mockReq.body = { name: 123 };
      validateRequest(schema)(mockReq as Request, mockRes as Response, next);

      expect(next).not.toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(400);
      const body = (mockRes.json as jest.Mock).mock.calls[0][0];
      expect(body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('validateQuery', () => {
    const schema = z.object({ limit: z.string().optional() });

    test('attaches validatedQuery and calls next() on success', () => {
      mockReq.query = { limit: '10' };
      validateQuery(schema)(mockReq as Request, mockRes as Response, next);

      expect(next).toHaveBeenCalled();
      expect(mockReq.validatedQuery).toEqual({ limit: '10' });
    });

    test('responds 400 on failure', () => {
      mockReq.query = { limit: 42 as unknown as string };
      validateQuery(schema)(mockReq as Request, mockRes as Response, next);

      expect(next).not.toHaveBeenCalled();
      const body = (mockRes.json as jest.Mock).mock.calls[0][0];
      expect(body.error.code).toBe('QUERY_VALIDATION_ERROR');
    });
  });

  describe('validateParams', () => {
    const schema = z.object({ id: z.string() });

    test('attaches validatedParams and calls next() on success', () => {
      mockReq.params = { id: 'abc' };
      validateParams(schema)(mockReq as Request, mockRes as Response, next);

      expect(next).toHaveBeenCalled();
      expect(mockReq.validatedParams).toEqual({ id: 'abc' });
    });

    test('responds 400 on failure', () => {
      mockReq.params = {};
      validateParams(schema)(mockReq as Request, mockRes as Response, next);

      expect(next).not.toHaveBeenCalled();
      const body = (mockRes.json as jest.Mock).mock.calls[0][0];
      expect(body.error.code).toBe('PARAMS_VALIDATION_ERROR');
    });
  });
});
