import { act } from '@testing-library/react';

export type StudioTest = typeof jest & {
  areTimersFake(): boolean;
  restoreTimers(): void;
  runWithFakeTimers<T>(fun: () => T): T;
};

// Jest adds the isFake flag to the Date object; see https://github.com/jestjs/jest/issues/10555#issuecomment-1820587985
declare global {
  interface DateConstructor {
    isFake: boolean;
  }
}

export const studioTest: StudioTest = {
  ...jest,
  runWithFakeTimers<T>(fun: () => T): T {
    const isUsingRealTimers = !this.areTimersFake();
    this.useFakeTimers();
    const result = fun();
    if (isUsingRealTimers) this.restoreTimers();
    return result;
  },
  areTimersFake: () => global.Date.isFake === true, // Workaround for a missing feature. See https://github.com/jestjs/jest/issues/10555.
  restoreTimers() {
    act(() => this.runOnlyPendingTimers());
    this.useRealTimers();
  },
};
