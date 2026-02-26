import { TimeValue } from 'src/app-components/TimePicker/types';
import {
  formatSegmentValue,
  formatTimeValue,
  isValidSegmentInput,
  parseSegmentInput,
} from 'src/app-components/TimePicker/utils/timeFormatUtils';

describe('Time Format Utilities', () => {
  describe('formatTimeValue', () => {
    it('should format 24-hour time correctly', () => {
      const time: TimeValue = { hours: 14, minutes: 30, seconds: 0, period: 'AM' };
      const result = formatTimeValue(time, 'HH:mm');
      expect(result).toBe('14:30');
    });

    it('should format 12-hour time correctly', () => {
      const time: TimeValue = { hours: 14, minutes: 30, seconds: 0, period: 'PM' };
      const result = formatTimeValue(time, 'hh:mm a');
      expect(result).toBe('02:30 PM');
    });

    it('should format time with seconds', () => {
      const time: TimeValue = { hours: 14, minutes: 30, seconds: 45, period: 'AM' };
      const result = formatTimeValue(time, 'HH:mm:ss');
      expect(result).toBe('14:30:45');
    });

    it('should handle midnight in 12-hour format', () => {
      const time: TimeValue = { hours: 0, minutes: 0, seconds: 0, period: 'AM' };
      const result = formatTimeValue(time, 'hh:mm a');
      expect(result).toBe('12:00 AM');
    });

    it('should handle noon in 12-hour format', () => {
      const time: TimeValue = { hours: 12, minutes: 0, seconds: 0, period: 'PM' };
      const result = formatTimeValue(time, 'hh:mm a');
      expect(result).toBe('12:00 PM');
    });

    it('should pad single digits with zeros', () => {
      const time: TimeValue = { hours: 9, minutes: 5, seconds: 3, period: 'AM' };
      const result = formatTimeValue(time, 'HH:mm:ss');
      expect(result).toBe('09:05:03');
    });
  });

  describe('formatSegmentValue', () => {
    it('should format hours for 24-hour display', () => {
      const result = formatSegmentValue(14, 'hours', 'HH:mm');
      expect(result).toBe('14');
    });

    it('should format hours for 12-hour display', () => {
      const result = formatSegmentValue(14, 'hours', 'hh:mm a');
      expect(result).toBe('02');
    });

    it('should format single digit hours with leading zero', () => {
      const result = formatSegmentValue(5, 'hours', 'HH:mm');
      expect(result).toBe('05');
    });

    it('should format minutes with leading zero', () => {
      const result = formatSegmentValue(7, 'minutes', 'HH:mm');
      expect(result).toBe('07');
    });

    it('should format seconds with leading zero', () => {
      const result = formatSegmentValue(3, 'seconds', 'HH:mm:ss');
      expect(result).toBe('03');
    });

    it('should handle midnight hour in 12-hour format', () => {
      const result = formatSegmentValue(0, 'hours', 'hh:mm a');
      expect(result).toBe('12');
    });

    it('should handle noon hour in 12-hour format', () => {
      const result = formatSegmentValue(12, 'hours', 'hh:mm a');
      expect(result).toBe('12');
    });

    it('should format period segment', () => {
      const result = formatSegmentValue('AM', 'period', 'hh:mm a');
      expect(result).toBe('AM');
    });
  });

  describe('parseSegmentInput', () => {
    it('should parse valid hour input', () => {
      const result = parseSegmentInput('14', 'hours', 'HH:mm');
      expect(result).toBe(14);
    });

    it('should parse hour input with leading zero', () => {
      const result = parseSegmentInput('08', 'hours', 'HH:mm');
      expect(result).toBe(8);
    });

    it('should parse single digit input', () => {
      const result = parseSegmentInput('5', 'minutes', 'HH:mm');
      expect(result).toBe(5);
    });

    it('should parse period input', () => {
      const result = parseSegmentInput('PM', 'period', 'hh:mm a');
      expect(result).toBe('PM');
    });

    it('should handle case insensitive period input', () => {
      const result = parseSegmentInput('pm', 'period', 'hh:mm a');
      expect(result).toBe('PM');
    });

    it('should return null for invalid numeric input', () => {
      const result = parseSegmentInput('abc', 'hours', 'HH:mm');
      expect(result).toBe(null);
    });

    it('should return null for invalid period input', () => {
      const result = parseSegmentInput('XM', 'period', 'hh:mm a');
      expect(result).toBe(null);
    });

    it('should return null for empty input', () => {
      const result = parseSegmentInput('', 'hours', 'HH:mm');
      expect(result).toBe(null);
    });
  });

  describe('isValidSegmentInput', () => {
    it('should validate hour input for 24-hour format', () => {
      expect(isValidSegmentInput('14', 'hours', 'HH:mm')).toBe(true);
      expect(isValidSegmentInput('23', 'hours', 'HH:mm')).toBe(true);
      expect(isValidSegmentInput('00', 'hours', 'HH:mm')).toBe(true);
      expect(isValidSegmentInput('24', 'hours', 'HH:mm')).toBe(false);
      expect(isValidSegmentInput('-1', 'hours', 'HH:mm')).toBe(false);
    });

    it('should validate hour input for 12-hour format', () => {
      expect(isValidSegmentInput('12', 'hours', 'hh:mm a')).toBe(true);
      expect(isValidSegmentInput('01', 'hours', 'hh:mm a')).toBe(true);
      expect(isValidSegmentInput('13', 'hours', 'hh:mm a')).toBe(false);
      expect(isValidSegmentInput('00', 'hours', 'hh:mm a')).toBe(false);
    });

    it('should validate minute input', () => {
      expect(isValidSegmentInput('00', 'minutes', 'HH:mm')).toBe(true);
      expect(isValidSegmentInput('59', 'minutes', 'HH:mm')).toBe(true);
      expect(isValidSegmentInput('60', 'minutes', 'HH:mm')).toBe(false);
      expect(isValidSegmentInput('-1', 'minutes', 'HH:mm')).toBe(false);
    });

    it('should validate second input', () => {
      expect(isValidSegmentInput('00', 'seconds', 'HH:mm:ss')).toBe(true);
      expect(isValidSegmentInput('59', 'seconds', 'HH:mm:ss')).toBe(true);
      expect(isValidSegmentInput('60', 'seconds', 'HH:mm:ss')).toBe(false);
    });

    it('should validate period input', () => {
      expect(isValidSegmentInput('AM', 'period', 'hh:mm a')).toBe(true);
      expect(isValidSegmentInput('PM', 'period', 'hh:mm a')).toBe(true);
      expect(isValidSegmentInput('am', 'period', 'hh:mm a')).toBe(true);
      expect(isValidSegmentInput('pm', 'period', 'hh:mm a')).toBe(true);
      expect(isValidSegmentInput('XM', 'period', 'hh:mm a')).toBe(false);
    });

    it('should handle partial input during typing', () => {
      expect(isValidSegmentInput('1', 'hours', 'HH:mm')).toBe(true);
      expect(isValidSegmentInput('2', 'hours', 'HH:mm')).toBe(true);
      expect(isValidSegmentInput('3', 'hours', 'HH:mm')).toBe(true); // Should be valid, becomes 03
      expect(isValidSegmentInput('9', 'hours', 'HH:mm')).toBe(true); // Should be valid, becomes 09
      expect(isValidSegmentInput('5', 'minutes', 'HH:mm')).toBe(true); // Should be valid, becomes 05
    });

    it('should reject non-numeric input for numeric segments', () => {
      expect(isValidSegmentInput('abc', 'hours', 'HH:mm')).toBe(false);
      expect(isValidSegmentInput('1a', 'minutes', 'HH:mm')).toBe(false);
    });
  });

  describe('Edge Cases', () => {
    it('should handle boundary values correctly', () => {
      // Test edge cases for each segment type
      expect(formatSegmentValue(0, 'hours', 'HH:mm')).toBe('00');
      expect(formatSegmentValue(23, 'hours', 'HH:mm')).toBe('23');
      expect(formatSegmentValue(0, 'minutes', 'HH:mm')).toBe('00');
      expect(formatSegmentValue(59, 'minutes', 'HH:mm')).toBe('59');
      expect(formatSegmentValue(0, 'seconds', 'HH:mm:ss')).toBe('00');
      expect(formatSegmentValue(59, 'seconds', 'HH:mm:ss')).toBe('59');
    });

    it('should handle format variations', () => {
      const time: TimeValue = { hours: 9, minutes: 5, seconds: 3, period: 'AM' };

      expect(formatTimeValue(time, 'HH:mm')).toBe('09:05');
      expect(formatTimeValue(time, 'HH:mm:ss')).toBe('09:05:03');
      expect(formatTimeValue(time, 'hh:mm a')).toBe('09:05 AM');
      expect(formatTimeValue(time, 'hh:mm:ss a')).toBe('09:05:03 AM');
    });

    it('should handle hour conversion edge cases', () => {
      // Test 12-hour to 24-hour conversions
      expect(formatSegmentValue(0, 'hours', 'hh:mm a')).toBe('12'); // Midnight
      expect(formatSegmentValue(12, 'hours', 'hh:mm a')).toBe('12'); // Noon
      expect(formatSegmentValue(13, 'hours', 'hh:mm a')).toBe('01'); // 1 PM
      expect(formatSegmentValue(23, 'hours', 'hh:mm a')).toBe('11'); // 11 PM
    });
  });
});
