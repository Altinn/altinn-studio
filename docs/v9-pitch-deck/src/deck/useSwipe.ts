import { useRef, type TouchEvent } from 'react';

interface SwipeOptions {
  onSwipeLeft: () => void;
  onSwipeRight: () => void;
  /** Minimum horizontal travel in CSS px. */
  threshold?: number;
  /** Reject gestures that are mostly vertical. */
  maxVerticalRatio?: number;
}

/** Minimal horizontal swipe detection for touch-driven presenting. */
export function useSwipe({
  onSwipeLeft,
  onSwipeRight,
  threshold = 56,
  maxVerticalRatio = 0.8,
}: SwipeOptions) {
  const start = useRef<{ x: number; y: number } | null>(null);

  const onTouchStart = (e: TouchEvent) => {
    const t = e.touches[0];
    if (!t) return;
    start.current = { x: t.clientX, y: t.clientY };
  };

  const onTouchEnd = (e: TouchEvent) => {
    const s = start.current;
    start.current = null;
    const t = e.changedTouches[0];
    if (!s || !t) return;

    const dx = t.clientX - s.x;
    const dy = t.clientY - s.y;
    if (Math.abs(dx) < threshold) return;
    if (Math.abs(dy) > Math.abs(dx) * maxVerticalRatio) return;

    if (dx < 0) onSwipeLeft();
    else onSwipeRight();
  };

  return { onTouchStart, onTouchEnd };
}
