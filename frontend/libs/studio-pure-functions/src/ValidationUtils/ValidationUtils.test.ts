import { ValidationUtils } from './ValidationUtils';

describe('ValidationUtils', () => {
  describe('valueExists', () => {
    it('should return true when value is not undefined and not empty', () => {
      expect(ValidationUtils.valueExists('test')).toBe(true);
    });
    it('should return true when value is 0', () => {
      expect(ValidationUtils.valueExists(0)).toBe(true);
    });
    it('should return false when value is null', () => {
      expect(ValidationUtils.valueExists(null)).toBe(false);
    });
    it('should return false when value is undefined', () => {
      expect(ValidationUtils.valueExists(undefined)).toBe(false);
    });
    it('should return false when value is empty', () => {
      expect(ValidationUtils.valueExists('')).toBe(false);
    });
  });
});
