import { formatDateToDateAndTimeString, isDateAfter, isValidDate, isValidTime } from './dateUtils';

describe('dateUtils', () => {
  describe('formatDateToDateAndTimeString', () => {
    const mockDateString: string = '2023-09-20T07:01:47';
    const mockFormattedString: string = '20.09.2023, 07:01';

    it('formats the date correctly', () => {
      const formatedDate = formatDateToDateAndTimeString(mockDateString);
      expect(formatedDate).toEqual(mockFormattedString);
    });
  });

  describe('isValidDate', () => {
    it('returns true for valid date', () => {
      expect(isValidDate('2023-08-29')).toBe(true);
    });

    it('returns false for invalid date', () => {
      expect(isValidDate('invalid-date')).toBe(false);
    });
  });

  describe('isValidTime', () => {
    it('returns true for valid time', () => {
      expect(isValidTime('14:30')).toBe(true);
    });

    it('returns false for invalid time', () => {
      expect(isValidTime('invalid-time')).toBe(false);
    });
  });

  describe('isDateAfter', () => {
    it('returns true when the first date is after the second date', () => {
      expect(isDateAfter('2023-08-30', '2023-08-29')).toBe(true);
    });

    it('returns false when the first date is before the second date', () => {
      expect(isDateAfter('2023-08-29', '2023-08-30')).toBe(false);
    });

    it('returns false when the dates are the same', () => {
      expect(isDateAfter('2023-08-29', '2023-08-29')).toBe(false);
    });
  });
});
