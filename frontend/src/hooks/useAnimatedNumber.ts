import { useEffect, useRef, useState } from 'react';

interface AnimatedNumberOptions {
  durationMs?: number;
}

export type ChangeDirection = 'up' | 'down';

// No animation without matchMedia or requestAnimationFrame (tests, old browsers)
// or when the user asked the system for reduced motion.
function shouldSkipAnimation(): boolean {
  if (typeof window === 'undefined') return true;
  if (typeof window.matchMedia !== 'function') return true;
  if (typeof window.requestAnimationFrame !== 'function') return true;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

/** Tweens the returned number from the displayed value to `value` on each change. */
export function useAnimatedNumber(value: number, { durationMs = 400 }: AnimatedNumberOptions = {}) {
  const [display, setDisplay] = useState(value);
  const displayRef = useRef(value);

  useEffect(() => {
    const from = displayRef.current;
    const show = (next: number) => {
      displayRef.current = next;
      setDisplay(next);
    };

    if (from === value) return undefined;
    if (shouldSkipAnimation() || durationMs <= 0) {
      show(value);
      return undefined;
    }

    let frameId = 0;
    let start: number | null = null;
    const step = (time: number) => {
      if (start === null) start = time;
      const progress = Math.min((time - start) / durationMs, 1);
      show(progress >= 1 ? value : from + (value - from) * easeOutCubic(progress));
      if (progress < 1) frameId = window.requestAnimationFrame(step);
    };
    frameId = window.requestAnimationFrame(step);
    return () => window.cancelAnimationFrame(frameId);
  }, [value, durationMs]);

  return display;
}

/** Reports whether `value` just went up or down; resets after `durationMs`. */
export function useChangeHighlight(value: number, durationMs = 1200): ChangeDirection | null {
  const [direction, setDirection] = useState<ChangeDirection | null>(null);
  const previousRef = useRef(value);

  useEffect(() => {
    const previous = previousRef.current;
    previousRef.current = value;
    if (previous === value) return undefined;
    setDirection(value > previous ? 'up' : 'down');
    const timer = setTimeout(() => setDirection(null), durationMs);
    return () => clearTimeout(timer);
  }, [value, durationMs]);

  return direction;
}
