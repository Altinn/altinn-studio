import { valueExists } from './value';

describe('value util', () => {
  describe('valueExists', () => {
    it('should return true when value is not undefined and not empty', () => {
      expect(valueExists('test')).toBe(true);
    });
    it('should return true when value is 0', () => {
      expect(valueExists('0')).toBe(true);
    });
    it('should return false when value is null', () => {
      expect(valueExists(null)).toBe(false);
    });
    it('should return false when value is undefined', () => {
      expect(valueExists(undefined)).toBe(false);
    });
    it('should return false when value is empty', () => {
      expect(valueExists('')).toBe(false);
    });
  });
});
