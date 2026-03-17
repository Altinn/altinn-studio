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
