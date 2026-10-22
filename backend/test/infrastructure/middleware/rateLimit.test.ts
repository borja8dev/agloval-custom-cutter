import { Request, Response } from 'express';
import { createRateLimit } from '../../../src/infrastructure/web/middleware/rateLimit';

const fakeRequest = (ip: string): Request => ({ ip, requestId: 'req-1' }) as unknown as Request;

function fakeResponse() {
  const res = {
    statusCode: 200,
    body: undefined as unknown,
    headers: {} as Record<string, string>,
    status(code: number) {
      res.statusCode = code;
      return res;
    },
    json(body: unknown) {
      res.body = body;
      return res;
    },
    setHeader(name: string, value: string) {
      res.headers[name] = value;
      return res;
    },
  };
  return res;
}

/** Runs the middleware once and reports whether the request went through. */
function hit(limit: ReturnType<typeof createRateLimit>, ip = '203.0.113.7') {
  const res = fakeResponse();
  const next = jest.fn();
  limit(fakeRequest(ip), res as unknown as Response, next);
  return { passed: next.mock.calls.length === 1, res };
}

describe('createRateLimit', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-10-22T10:00:00Z'));
  });

  afterEach(() => jest.useRealTimers());

  test('lets the first N requests of an IP through and blocks the next with 429', () => {
    const limit = createRateLimit({ max: 3, windowMs: 60_000 });

    expect([hit(limit), hit(limit), hit(limit)].map((r) => r.passed)).toEqual([true, true, true]);

    const blocked = hit(limit);
    expect(blocked.passed).toBe(false);
    expect(blocked.res.statusCode).toBe(429);
    expect(blocked.res.headers['Retry-After']).toBe('60');
    expect(blocked.res.body).toMatchObject({
      success: false,
      error: {
        code: 'TOO_MANY_REQUESTS',
        message: 'Demasiados envíos seguidos. Inténtalo de nuevo más tarde.',
      },
      requestId: 'req-1',
    });
  });

  test('counts each IP separately', () => {
    const limit = createRateLimit({ max: 1, windowMs: 60_000 });

    expect(hit(limit, '203.0.113.1').passed).toBe(true);
    expect(hit(limit, '203.0.113.1').passed).toBe(false);
    expect(hit(limit, '203.0.113.2').passed).toBe(true);
  });

  test('resets once the window has passed', () => {
    const limit = createRateLimit({ max: 2, windowMs: 60_000 });
    hit(limit);
    hit(limit);
    expect(hit(limit).passed).toBe(false);

    jest.advanceTimersByTime(59_999);
    expect(hit(limit).passed).toBe(false);

    jest.advanceTimersByTime(1);
    expect(hit(limit).passed).toBe(true);
  });

  test('defaults to 5 requests per 10 minutes', () => {
    const limit = createRateLimit();
    for (let i = 0; i < 5; i++) expect(hit(limit).passed).toBe(true);
    expect(hit(limit).passed).toBe(false);

    jest.advanceTimersByTime(10 * 60_000);
    expect(hit(limit).passed).toBe(true);
  });
});
