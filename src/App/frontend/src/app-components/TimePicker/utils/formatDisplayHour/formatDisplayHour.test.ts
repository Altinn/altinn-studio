import { formatDisplayHour } from 'src/app-components/TimePicker/utils/formatDisplayHour/formatDisplayHour';

describe('formatDisplayHour', () => {
  describe('24-hour format', () => {
    it('should return hour unchanged for 24-hour format', () => {
      expect(formatDisplayHour(0, false)).toBe(0);
      expect(formatDisplayHour(1, false)).toBe(1);
      expect(formatDisplayHour(12, false)).toBe(12);
      expect(formatDisplayHour(13, false)).toBe(13);
      expect(formatDisplayHour(23, false)).toBe(23);
    });
  });

  describe('12-hour format', () => {
    it('should convert midnight (0) to 12', () => {
      expect(formatDisplayHour(0, true)).toBe(12);
    });

    it('should keep AM hours (1-12) unchanged', () => {
      expect(formatDisplayHour(1, true)).toBe(1);
      expect(formatDisplayHour(11, true)).toBe(11);
      expect(formatDisplayHour(12, true)).toBe(12); // Noon stays 12
    });

    it('should convert PM hours (13-23) to 1-11', () => {
      expect(formatDisplayHour(13, true)).toBe(1);
      expect(formatDisplayHour(14, true)).toBe(2);
      expect(formatDisplayHour(18, true)).toBe(6);
      expect(formatDisplayHour(23, true)).toBe(11);
    });
  });

  describe('edge cases', () => {
    it('should handle boundary values correctly', () => {
      // Midnight
      expect(formatDisplayHour(0, true)).toBe(12);
      expect(formatDisplayHour(0, false)).toBe(0);

      // Noon
      expect(formatDisplayHour(12, true)).toBe(12);
      expect(formatDisplayHour(12, false)).toBe(12);

      // 1 PM
      expect(formatDisplayHour(13, true)).toBe(1);
      expect(formatDisplayHour(13, false)).toBe(13);

      // 11 PM
      expect(formatDisplayHour(23, true)).toBe(11);
      expect(formatDisplayHour(23, false)).toBe(23);
    });
  });

  describe('comprehensive 12-hour conversion table', () => {
    const conversions = [
      { input: 0, expected: 12 }, // 12:xx AM (midnight)
      { input: 1, expected: 1 }, // 1:xx AM
      { input: 11, expected: 11 }, // 11:xx AM
      { input: 12, expected: 12 }, // 12:xx PM (noon)
      { input: 13, expected: 1 }, // 1:xx PM
      { input: 14, expected: 2 }, // 2:xx PM
      { input: 18, expected: 6 }, // 6:xx PM
      { input: 23, expected: 11 }, // 11:xx PM
    ];

    it.each(conversions)('should convert hour $input to $expected in 12-hour format', ({ input, expected }) => {
      expect(formatDisplayHour(input, true)).toBe(expected);
    });
  });
});
