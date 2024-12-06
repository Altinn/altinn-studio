import { NumberUtils } from './NumberUtils';
import type { Interval } from '../types';

describe('NumberUtils', () => {
  describe('isWithinOpenInterval', () => {
    const testInterval: Interval = { min: 0, max: 10 };

    it('Returns true if the value is within the interval', () => {
      expect(NumberUtils.isWithinOpenInterval(5, testInterval)).toBe(true);
    });

    it('Returns false if the value is equal to the minimum', () => {
      expect(NumberUtils.isWithinOpenInterval(0, testInterval)).toBe(false);
    });

    it('Returns false if the value is equal to the maximum', () => {
      expect(NumberUtils.isWithinOpenInterval(10, testInterval)).toBe(false);
    });

    it('Returns false if the value is below the interval', () => {
      expect(NumberUtils.isWithinOpenInterval(-1, testInterval)).toBe(false);
    });

    it('Returns false if the value is above the interval', () => {
      expect(NumberUtils.isWithinOpenInterval(11, testInterval)).toBe(false);
    });
  });
});
