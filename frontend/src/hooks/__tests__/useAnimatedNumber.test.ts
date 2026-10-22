import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useAnimatedNumber, useChangeHighlight } from '../useAnimatedNumber';

type FrameCallback = (time: number) => void;

function mockMotion(reduce: boolean) {
  vi.stubGlobal(
    'matchMedia',
    vi.fn((query: string) => ({
      matches: reduce && query.includes('reduce'),
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }))
  );
}

function mockFrames() {
  let queue: FrameCallback[] = [];
  vi.stubGlobal(
    'requestAnimationFrame',
    vi.fn((cb: FrameCallback) => {
      queue.push(cb);
      return queue.length;
    })
  );
  vi.stubGlobal('cancelAnimationFrame', vi.fn());
  return (time: number) =>
    act(() => {
      const pending = queue;
      queue = [];
      pending.forEach((cb) => cb(time));
    });
}

describe('useAnimatedNumber', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  test('starts at the initial value', () => {
    mockMotion(false);
    mockFrames();
    const { result } = renderHook(() => useAnimatedNumber(42));
    expect(result.current).toBe(42);
  });

  test('jumps straight to the target when the user prefers reduced motion', () => {
    mockMotion(true);
    const frame = mockFrames();
    const { result, rerender } = renderHook(({ value }) => useAnimatedNumber(value), {
      initialProps: { value: 0 },
    });
    rerender({ value: 100 });
    expect(result.current).toBe(100);
    frame(0);
    expect(result.current).toBe(100);
  });

  test('jumps straight to the target when matchMedia is not available', () => {
    const { result, rerender } = renderHook(({ value }) => useAnimatedNumber(value), {
      initialProps: { value: 10 },
    });
    rerender({ value: 20 });
    expect(result.current).toBe(20);
  });

  test('tweens through intermediate values and reaches the target', () => {
    mockMotion(false);
    const frame = mockFrames();
    const { result, rerender } = renderHook(
      ({ value }) => useAnimatedNumber(value, { durationMs: 400 }),
      { initialProps: { value: 0 } }
    );
    rerender({ value: 100 });
    frame(1000);
    expect(result.current).toBe(0);
    frame(1200);
    expect(result.current).toBeGreaterThan(50);
    expect(result.current).toBeLessThan(100);
    frame(1400);
    expect(result.current).toBe(100);
  });

  test('tweens downwards from the currently displayed value', () => {
    mockMotion(false);
    const frame = mockFrames();
    const { result, rerender } = renderHook(({ value }) => useAnimatedNumber(value), {
      initialProps: { value: 100 },
    });
    rerender({ value: 40 });
    frame(0);
    frame(100);
    expect(result.current).toBeLessThan(100);
    expect(result.current).toBeGreaterThan(40);
    frame(1000);
    expect(result.current).toBe(40);
  });
});

describe('useChangeHighlight', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  test('does not highlight the initial value', () => {
    const { result } = renderHook(() => useChangeHighlight(10));
    expect(result.current).toBeNull();
  });

  test('flags increases and decreases for a short time', () => {
    const { result, rerender } = renderHook(({ value }) => useChangeHighlight(value, 1000), {
      initialProps: { value: 10 },
    });
    rerender({ value: 20 });
    expect(result.current).toBe('up');
    act(() => vi.advanceTimersByTime(1000));
    expect(result.current).toBeNull();
    rerender({ value: 5 });
    expect(result.current).toBe('down');
  });
});
