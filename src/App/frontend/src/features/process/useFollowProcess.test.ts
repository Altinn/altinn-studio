import { act, renderHook } from '@testing-library/react';

import { useBackoff } from 'src/features/process/useFollowProcess';

describe('useBackoff', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  function advance(ms: number) {
    act(() => {
      vi.advanceTimersByTime(ms);
    });
  }

  // Drives the poll through the fast phase (10 ticks at 1s) and three slowing ticks (1s, 2s, 3s),
  // leaving the next tick 4s out. Returns the total number of calls made (13).
  function pushPastFastPhase(callback: Mock) {
    advance(10_000);
    expect(callback).toHaveBeenCalledTimes(10);
    advance(1_000);
    advance(2_000);
    advance(3_000);
    expect(callback).toHaveBeenCalledTimes(13);
  }

  it('polls once a second at first, then slows down', () => {
    const callback = vi.fn().mockResolvedValue(undefined);
    renderHook(() => useBackoff(callback));

    pushPastFastPhase(callback);

    // The cadence has slowed: the next tick is 4s out, so nothing fires within the first second.
    advance(1_000);
    expect(callback).toHaveBeenCalledTimes(13);
    advance(3_000);
    expect(callback).toHaveBeenCalledTimes(14);
  });

  it('stops polling entirely while disabled', () => {
    const callback = vi.fn().mockResolvedValue(undefined);
    const { rerender } = renderHook(({ enabled }) => useBackoff(callback, enabled), {
      initialProps: { enabled: true },
    });

    advance(3_000);
    expect(callback).toHaveBeenCalledTimes(3);

    rerender({ enabled: false });
    advance(60_000);
    expect(callback).toHaveBeenCalledTimes(3);
  });

  it('restarts the backoff from the fast cadence when re-enabled', () => {
    // The hook can outlive a single waiting episode (ProcessWrapper mounts it for the whole
    // instance session and toggles `enabled` per parked service task), so a new episode must not
    // inherit the slowed-down cadence from an earlier long wait.
    const callback = vi.fn().mockResolvedValue(undefined);
    const { rerender } = renderHook(({ enabled }) => useBackoff(callback, enabled), {
      initialProps: { enabled: true },
    });

    pushPastFastPhase(callback);
    callback.mockClear();

    rerender({ enabled: false });
    advance(60_000);
    expect(callback).not.toHaveBeenCalled();

    // A new episode starts at the fast cadence: first poll after 1s, not the inherited 4s+.
    rerender({ enabled: true });
    advance(1_000);
    expect(callback).toHaveBeenCalledTimes(1);
    advance(1_000);
    expect(callback).toHaveBeenCalledTimes(2);
  });

  it('does NOT restart the backoff when only the callback identity changes', () => {
    // The effect re-runs whenever the callback changes (fresh process data produces a new
    // useCallback identity in useFollowProcess) - resetting there would pin the poll at the
    // fastest cadence forever. Only the disabled->enabled transition resets.
    const firstCallback = vi.fn().mockResolvedValue(undefined);
    const secondCallback = vi.fn().mockResolvedValue(undefined);
    const { rerender } = renderHook(({ cb }) => useBackoff(cb, true), {
      initialProps: { cb: firstCallback },
    });

    pushPastFastPhase(firstCallback);

    rerender({ cb: secondCallback });

    // Still on the slow cadence: the next tick is 4s out, not 1s.
    advance(1_000);
    expect(secondCallback).not.toHaveBeenCalled();
    advance(3_000);
    expect(secondCallback).toHaveBeenCalledTimes(1);
  });
});
import type { Mock } from 'vitest';
