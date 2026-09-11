import { useCallback, useEffect, useRef, useState } from 'react';
import type { SlideDef } from './types';

export type Direction = 1 | -1;

export interface DeckNav {
  index: number;
  step: number;
  /** +1 when the last move went forward, -1 when it went back. Drives transitions. */
  direction: Direction;
  total: number;
  stepsOnCurrent: number;
  next: () => void;
  prev: () => void;
  nextSlide: () => void;
  prevSlide: () => void;
  goTo: (index: number, step?: number) => void;
  first: () => void;
  last: () => void;
}

const clamp = (n: number, min: number, max: number) => Math.min(Math.max(n, min), max);

interface HashState {
  index: number;
  step: number;
}

/** Where the deck is standing. One object, so every move is one atomic update. */
interface Position extends HashState {
  direction: Direction;
}

/** `#/3` -> slide 3 (1-based) step 0. `#/3/2` -> slide 3, build step 2. */
function parseHash(hash: string, total: number): HashState | null {
  const m = /^#\/(\d+)(?:\/(\d+))?$/.exec(hash);
  if (!m) return null;
  const index = clamp(Number(m[1]) - 1, 0, Math.max(total - 1, 0));
  const step = m[2] ? Math.max(Number(m[2]), 0) : 0;
  return { index, step };
}

function formatHash({ index, step }: HashState): string {
  return step > 0 ? `#/${index + 1}/${step}` : `#/${index + 1}`;
}

export function useDeckNav(slides: SlideDef[]): DeckNav {
  const total = slides.length;
  const stepsOf = useCallback((i: number) => Math.max(slides[i]?.steps ?? 0, 0), [slides]);

  const [pos, setPos] = useState<Position>(() => {
    const initial = parseHash(window.location.hash, total) ?? { index: 0, step: 0 };
    const steps = Math.max(slides[initial.index]?.steps ?? 0, 0);
    return { index: initial.index, step: clamp(initial.step, 0, steps), direction: 1 };
  });

  // Guards the write-back so our own hash update does not re-enter as navigation.
  const selfHash = useRef<string>('');

  /**
   * Every move is a functional update, so it can never read a stale `index` or
   * `step` out of the render closure it was created in. That is what makes a
   * held-down arrow key safe: two key events inside one React commit still
   * advance twice instead of collapsing into one.
   *
   * Returning the SAME object when nothing moved skips the re-render entirely,
   * which is how the deck parks silently on the first and last state.
   *
   * `direction` changes only when `index` does. A build step inside a slide must
   * not disturb it, or the slide-level transition re-resolves mid-slide.
   */
  const goTo = useCallback(
    (nextIndex: number, nextStep = 0) => {
      setPos((p) => {
        const index = clamp(nextIndex, 0, Math.max(total - 1, 0));
        const step = clamp(nextStep, 0, stepsOf(index));
        if (index === p.index && step === p.step) return p;
        return {
          index,
          step,
          direction: index === p.index ? p.direction : index > p.index ? 1 : -1,
        };
      });
    },
    [stepsOf, total],
  );

  const next = useCallback(() => {
    setPos((p) => {
      if (p.step < stepsOf(p.index)) return { ...p, step: p.step + 1 };
      if (p.index >= total - 1) return p;
      return { index: p.index + 1, step: 0, direction: 1 };
    });
  }, [stepsOf, total]);

  const prev = useCallback(() => {
    setPos((p) => {
      if (p.step > 0) return { ...p, step: p.step - 1 };
      if (p.index <= 0) return p;
      // Land on the previous slide fully built, so stepping back reads continuously.
      return { index: p.index - 1, step: stepsOf(p.index - 1), direction: -1 };
    });
  }, [stepsOf]);

  const nextSlide = useCallback(() => {
    setPos((p) => (p.index >= total - 1 ? p : { index: p.index + 1, step: 0, direction: 1 }));
  }, [total]);

  const prevSlide = useCallback(() => {
    setPos((p) => (p.index <= 0 ? p : { index: p.index - 1, step: 0, direction: -1 }));
  }, []);

  const first = useCallback(() => goTo(0, 0), [goTo]);
  const last = useCallback(() => goTo(total - 1, 0), [goTo, total]);

  // --- URL hash: write on state change ---
  useEffect(() => {
    const hash = formatHash(pos);
    if (window.location.hash === hash) return;
    selfHash.current = hash;
    window.history.replaceState(null, '', hash);
  }, [pos]);

  // --- URL hash: read on external change (back button, pasted link, Playwright) ---
  useEffect(() => {
    const onHashChange = () => {
      if (window.location.hash === selfHash.current) return;
      const parsed = parseHash(window.location.hash, total);
      if (!parsed) return;
      goTo(parsed.index, parsed.step);
    };
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, [goTo, total]);

  return {
    index: pos.index,
    step: pos.step,
    direction: pos.direction,
    total,
    stepsOnCurrent: stepsOf(pos.index),
    next,
    prev,
    nextSlide,
    prevSlide,
    goTo,
    first,
    last,
  };
}
