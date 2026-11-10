import { vi } from 'vitest';
import { act } from '@testing-library/react';

export type StudioTest = typeof vi & {
  areTimersFake(): boolean;
  restoreTimers(): void;
  runWithFakeTimers<T>(fun: () => T): T;
  mockNextConfirmDialog(returnValue: boolean): void;
  waitForAnimationFrame(): Promise<void>;
};

export const studioTest: StudioTest = {
  ...vi,
  runWithFakeTimers<T>(fun: () => T): T {
    const isUsingRealTimers = !this.areTimersFake();
    this.useFakeTimers();
    try {
      return fun();
    } finally {
      if (isUsingRealTimers) this.restoreTimers();
    }
  },
  areTimersFake: () => vi.isFakeTimers(),
  restoreTimers() {
    act(() => this.runOnlyPendingTimers());
    this.useRealTimers();
  },
  mockNextConfirmDialog(returnValue: boolean) {
    this.spyOn(window, 'confirm').mockReturnValueOnce(returnValue);
  },
  async waitForAnimationFrame(): Promise<void> {
    await new Promise((resolve) => requestAnimationFrame(resolve));
  },
};
