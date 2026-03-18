import { act } from '@testing-library/react';

export type StudioTest = typeof jest & {
  areTimersFake(): boolean;
  restoreTimers(): void;
  runWithFakeTimers<T>(fun: () => T): T;
};

export const studioTest: StudioTest = {
  ...jest,
  runWithFakeTimers<T>(fun: () => T): T {
    const isUsingRealTimers = !this.areTimersFake();
    this.useFakeTimers();
    try {
      return fun();
    } finally {
      if (isUsingRealTimers) this.restoreTimers();
    }
  },
  areTimersFake: () => global.Date.isFake === true, // Workaround for a missing feature. See https://github.com/jestjs/jest/issues/10555.
  restoreTimers() {
    act(() => this.runOnlyPendingTimers());
    this.useRealTimers();
  },
};
