import { act, renderHook } from '@testing-library/react';

import { queryFocusManager } from 'src/core/queries/focusManager';
import { getPollingInterval, usePollingWithBackoff } from 'src/hooks/usePollingWithBackoff';

describe('usePollingWithBackoff()', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    queryFocusManager.setFocused(undefined);
    vi.useRealTimers();
  });

  async function advance(ms: number) {
    await act(async () => {
      await vi.advanceTimersByTimeAsync(ms);
    });
  }

  // Drives the poll through the fast phase (10 ticks at 1s) and three slowing ticks (2s, 3s, 4s),
  // leaving the next tick 5s out.
  async function pushPastFastPhase(callback: Mock) {
    await advance(10_000);
    expect(callback).toHaveBeenCalledTimes(10);
    await advance(2_000);
    await advance(3_000);
    await advance(4_000);
    expect(callback).toHaveBeenCalledTimes(13);
  }

  it('polls once a second at first, then slows down', async () => {
    const callback = vi.fn().mockResolvedValue(undefined);
    renderHook(() => usePollingWithBackoff(callback));

    await pushPastFastPhase(callback);

    // The cadence has slowed: the next tick is 5s out, so nothing fires within the first second.
    await advance(1_000);
    expect(callback).toHaveBeenCalledTimes(13);
    await advance(4_000);
    expect(callback).toHaveBeenCalledTimes(14);
  });

  it('uses the configured initial interval before backing off', async () => {
    const callback = vi.fn().mockResolvedValue(undefined);
    renderHook(() => usePollingWithBackoff(callback, true, { initialIntervalMs: 250 }));

    await advance(249);
    expect(callback).not.toHaveBeenCalled();
    await advance(1);
    expect(callback).toHaveBeenCalledTimes(1);
    await advance(2250);
    expect(callback).toHaveBeenCalledTimes(10);

    // After ten fast polls, retain the one-second increments and thirty-second cap.
    await advance(1249);
    expect(callback).toHaveBeenCalledTimes(10);
    await advance(1);
    expect(callback).toHaveBeenCalledTimes(11);
    expect(getPollingInterval(11, 250)).toBe(2250);
    expect(getPollingInterval(100, 250)).toBe(30_000);
  });

  it('allows a five-second fast phase for instance transitions', async () => {
    const callback = vi.fn().mockResolvedValue(undefined);
    renderHook(() => usePollingWithBackoff(callback, true, { initialIntervalMs: 250, initialAttempts: 20 }));

    await advance(5000);
    expect(callback).toHaveBeenCalledTimes(20);
    await advance(1249);
    expect(callback).toHaveBeenCalledTimes(20);
    await advance(1);
    expect(callback).toHaveBeenCalledTimes(21);
    expect(getPollingInterval(21, 250, 20)).toBe(2250);
    expect(getPollingInterval(100, 250, 20)).toBe(30_000);
  });

  it('stops polling entirely while disabled', async () => {
    const callback = vi.fn().mockResolvedValue(undefined);
    const { rerender } = renderHook(({ enabled }) => usePollingWithBackoff(callback, enabled), {
      initialProps: { enabled: true },
    });

    await advance(3_000);
    expect(callback).toHaveBeenCalledTimes(3);

    rerender({ enabled: false });
    await advance(60_000);
    expect(callback).toHaveBeenCalledTimes(3);
  });

  it('restarts the backoff from the fast cadence when re-enabled', async () => {
    // The hook can outlive a single waiting episode (ProcessWrapper mounts it for the whole
    // instance session and toggles `enabled` per parked service task), so a new episode must not
    // inherit the slowed-down cadence from an earlier long wait.
    const callback = vi.fn().mockResolvedValue(undefined);
    const { rerender } = renderHook(({ enabled }) => usePollingWithBackoff(callback, enabled), {
      initialProps: { enabled: true },
    });

    await pushPastFastPhase(callback);
    callback.mockClear();

    rerender({ enabled: false });
    await advance(60_000);
    expect(callback).not.toHaveBeenCalled();

    // A new episode starts at the fast cadence: first poll after 1s, not the inherited 5s+.
    rerender({ enabled: true });
    await advance(1_000);
    expect(callback).toHaveBeenCalledTimes(1);
    await advance(1_000);
    expect(callback).toHaveBeenCalledTimes(2);
  });

  it('does NOT restart the backoff when only the callback identity changes', async () => {
    // The effect re-runs whenever the callback changes (fresh process data produces a new
    // useCallback identity in useFollowProcess) - resetting there would pin the poll at the
    // fastest cadence forever. Only the disabled->enabled transition resets.
    const firstCallback = vi.fn().mockResolvedValue(undefined);
    const secondCallback = vi.fn().mockResolvedValue(undefined);
    const { rerender } = renderHook(({ cb }) => usePollingWithBackoff(cb, true), {
      initialProps: { cb: firstCallback },
    });

    await pushPastFastPhase(firstCallback);

    rerender({ cb: secondCallback });

    // Still on the slow cadence: the next tick is 5s out, not 1s.
    await advance(1_000);
    expect(secondCallback).not.toHaveBeenCalled();
    await advance(4_000);
    expect(secondCallback).toHaveBeenCalledTimes(1);
  });

  it('waits for a slow callback before scheduling the next poll', async () => {
    let resolve: (() => void) | undefined;
    const callback = vi.fn(() => new Promise<void>((done) => (resolve = done)));
    renderHook(() => usePollingWithBackoff(callback));

    await advance(1000);
    expect(callback).toHaveBeenCalledTimes(1);

    await advance(60_000);
    expect(callback).toHaveBeenCalledTimes(1);

    await act(async () => resolve?.());
    await advance(1000);
    expect(callback).toHaveBeenCalledTimes(2);
  });

  it('uses ten fast polls before increasing the interval', () => {
    expect(Array.from({ length: 10 }, (_, attempt) => getPollingInterval(attempt))).toEqual(
      Array.from({ length: 10 }, () => 1000),
    );
    expect(getPollingInterval(10)).toBe(2000);
    expect(getPollingInterval(11)).toBe(3000);
    expect(getPollingInterval(100)).toBe(30_000);
  });

  it('waits for the active callback when focus returns during a slow poll', async () => {
    let resolve: (() => void) | undefined;
    const callback = vi.fn(() => new Promise<void>((done) => (resolve = done)));
    const { unmount } = renderHook(() => usePollingWithBackoff(callback));

    await advance(1000);
    expect(callback).toHaveBeenCalledTimes(1);

    act(() => queryFocusManager.setFocused(false));
    act(() => queryFocusManager.setFocused(true));
    await advance(60_000);
    expect(callback).toHaveBeenCalledTimes(1);

    // Another blur/focus cycle must cancel the previous resume attempt too.
    act(() => queryFocusManager.setFocused(false));
    act(() => queryFocusManager.setFocused(true));
    await advance(0);
    expect(callback).toHaveBeenCalledTimes(1);

    await act(async () => resolve?.());
    expect(callback).toHaveBeenCalledTimes(2);
    await advance(60_000);
    expect(callback).toHaveBeenCalledTimes(2);
    unmount();
  });

  it('pauses in the background and polls immediately when focus returns', async () => {
    const callback = vi.fn().mockResolvedValue(undefined);
    const { unmount } = renderHook(() => usePollingWithBackoff(callback));

    await advance(1000);
    expect(callback).toHaveBeenCalledTimes(1);

    act(() => queryFocusManager.setFocused(false));
    await advance(60_000);
    expect(callback).toHaveBeenCalledTimes(1);

    act(() => queryFocusManager.setFocused(true));
    await advance(0);
    expect(callback).toHaveBeenCalledTimes(2);

    unmount();
  });
});
import type { Mock } from 'vitest';
