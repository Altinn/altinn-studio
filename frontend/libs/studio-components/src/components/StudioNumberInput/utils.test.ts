import { convertNumberToString, convertStringToNumber, isStringValidDecimalNumber } from './utils';

describe('utils', () => {
  it('isStringValidDecimalNumber should return true when input is integer', () => {
    expect(isStringValidDecimalNumber('123')).toBe(true);
  });

  it('isStringValidDecimalNumber should return true when input is decimal', () => {
    expect(isStringValidDecimalNumber('123.456')).toBe(true);
  });

  it('convertStringToNumber should return number', () => {
    expect(convertStringToNumber('123.456')).toBe(123.456);
  });

  it('convertNumberToString should return string', () => {
    expect(convertNumberToString(123.456)).toBe('123,456');
  });
});
