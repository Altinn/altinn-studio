import { studioTest } from './studioTest';

describe('studioTest', () => {
  describe('runWithFakeTimers', () => {
    it('Runs the given function with fake timers', () => {
      const delayedFunction = jest.fn();
      studioTest.runWithFakeTimers(() => {
        setTimeout(delayedFunction, 100);
        studioTest.runAllTimers();
      });
      expect(delayedFunction).toHaveBeenCalled();
    });

    it('Restores the timers', () => {
      const delayedFunction = jest.fn();
      studioTest.runWithFakeTimers(() => {
        setTimeout(delayedFunction, 100);
        studioTest.runAllTimers();
      });
      expect(studioTest.areTimersFake()).toBe(false);
    });

    it('Returns whatever the given function returns', () => {
      const returnedValue = 'Lorem ipsum dolor sit amet';
      const fun = (): string => returnedValue;
      expect(studioTest.runWithFakeTimers(fun)).toBe(returnedValue);
    });

    it('Rethrows when the given function throws an error', () => {
      const message = 'An error occurred';
      const fun = (): void => {
        throw Error(message);
      };
      expect(() => studioTest.runWithFakeTimers(fun)).toThrow(message);
    });

    it('Restores the timers when the given function throws an error', () => {
      const fun = (): void => {
        throw Error('An error occurred');
      };
      try {
        studioTest.runWithFakeTimers(fun);
      } catch {}
      expect(studioTest.areTimersFake()).toBe(false);
    });

    it('Does not restore timers when fake timers are on in the test scope', () => {
      studioTest.useFakeTimers();
      studioTest.runWithFakeTimers(studioTest.fn());
      const areTimersStillFakeAfterExecution = studioTest.areTimersFake();
      studioTest.useRealTimers();
      expect(areTimersStillFakeAfterExecution).toBe(true);
    });
  });

  describe('areTimersFake', () => {
    // If these tests fail when updating Jest, check https://github.com/jestjs/jest/issues/10555 for updates

    it('Returns true when timers are mocked', () => {
      studioTest.useFakeTimers();
      const result = studioTest.areTimersFake();
      studioTest.useRealTimers();
      expect(result).toBe(true);
    });

    it('Returns false when timers are not mocked', () => {
      expect(studioTest.areTimersFake()).toBe(false);
    });
  });
});
