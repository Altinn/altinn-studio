import { convertNumberToString, convertStringToNumber, isStringValidDecimalNumber } from './utils';

describe('utils', () => {
  describe('isStringValidDecimalNumber', () => {
    it('should return true when input is integer', () => {
      expect(isStringValidDecimalNumber('123')).toBe(true);
      expect(isStringValidDecimalNumber('0')).toBe(true);
    });
    it('should return true when input is decimal', () => {
      expect(isStringValidDecimalNumber('123.456')).toBe(true);
      expect(isStringValidDecimalNumber('123,456')).toBe(true);
    });
    it('should return true when input is an empty string', () => {
      expect(isStringValidDecimalNumber('')).toBe(true);
    });
    it('should return false when input is not a number', () => {
      expect(isStringValidDecimalNumber('abc')).toBe(false);
      expect(isStringValidDecimalNumber('123abc')).toBe(false);
    });
  });
  describe('convertStringToNumber', () => {
    it('should return number', () => {
      expect(convertStringToNumber('123.456')).toBe(123.456);
      expect(convertStringToNumber('123,456')).toBe(123.456);
      expect(convertStringToNumber('123')).toBe(123);
      expect(convertStringToNumber('')).toBe(null);
    });
  });
  describe('convertNumberToString', () => {
    it('should return string', () => {
      expect(convertNumberToString(123.456)).toBe('123,456');
      expect(convertNumberToString(123)).toBe('123');
      expect(convertNumberToString(0)).toBe('0');
      expect(convertNumberToString(undefined)).toBe('');
      expect(convertNumberToString(null)).toBe('');
    });
  });
});
