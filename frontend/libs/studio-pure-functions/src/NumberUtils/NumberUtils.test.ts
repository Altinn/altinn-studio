import { NumberUtils } from './NumberUtils';

describe('NumberUtils', () => {
  describe('isWithinOpenRange', () => {
    it('Returns true if the value is within the range', () => {
      expect(NumberUtils.isWithinOpenRange(5, 0, 10)).toBe(true);
    });

    it('Returns false if the value is equal to the minimum', () => {
      expect(NumberUtils.isWithinOpenRange(0, 0, 10)).toBe(false);
    });

    it('Returns false if the value is equal to the maximum', () => {
      expect(NumberUtils.isWithinOpenRange(10, 0, 10)).toBe(false);
    });

    it('Returns false if the value is below the range', () => {
      expect(NumberUtils.isWithinOpenRange(-1, 0, 10)).toBe(false);
    });

    it('Returns false if the value is above the range', () => {
      expect(NumberUtils.isWithinOpenRange(11, 0, 10)).toBe(false);
    });
  });
});
