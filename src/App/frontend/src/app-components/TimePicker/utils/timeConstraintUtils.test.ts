import { TimeValue } from 'src/app-components/TimePicker/types';
import {
  getNextValidValue,
  getSegmentConstraints,
  isTimeInRange,
  parseTimeString,
} from 'src/app-components/TimePicker/utils/timeConstraintUtils';

interface SegmentConstraints {
  min: number;
  max: number;
  validValues: number[];
}

describe('Time Constraint Utilities', () => {
  describe('parseTimeString', () => {
    it('should parse 24-hour format correctly', () => {
      const result = parseTimeString('14:30', 'HH:mm');
      expect(result).toEqual({
        hours: 14,
        minutes: 30,
        seconds: 0,
        period: undefined,
      });
    });

    it('should parse 12-hour format correctly', () => {
      const result = parseTimeString('2:30 PM', 'hh:mm a');
      expect(result).toEqual({
        hours: 14,
        minutes: 30,
        seconds: 0,
        period: 'PM',
      });
    });

    it('should parse format with seconds', () => {
      const result = parseTimeString('14:30:45', 'HH:mm:ss');
      expect(result).toEqual({
        hours: 14,
        minutes: 30,
        seconds: 45,
        period: undefined,
      });
    });

    it('should handle empty string', () => {
      const result = parseTimeString('', 'HH:mm');
      expect(result).toEqual({
        hours: 0,
        minutes: 0,
        seconds: 0,
        period: undefined,
      });
    });

    it('should handle 12 AM correctly', () => {
      const result = parseTimeString('12:00 AM', 'hh:mm a');
      expect(result).toEqual({
        hours: 0,
        minutes: 0,
        seconds: 0,
        period: 'AM',
      });
    });

    it('should handle 12 PM correctly', () => {
      const result = parseTimeString('12:00 PM', 'hh:mm a');
      expect(result).toEqual({
        hours: 12,
        minutes: 0,
        seconds: 0,
        period: 'PM',
      });
    });
  });

  describe('isTimeInRange', () => {
    const sampleTime: TimeValue = { hours: 14, minutes: 30, seconds: 0, period: 'PM' };

    it('should return true when time is within range', () => {
      const constraints = { minTime: '09:00', maxTime: '17:00' };
      const result = isTimeInRange(sampleTime, constraints, 'HH:mm');
      expect(result).toBe(true);
    });

    it('should return false when time is before minTime', () => {
      const constraints = { minTime: '15:00', maxTime: '17:00' };
      const result = isTimeInRange(sampleTime, constraints, 'HH:mm');
      expect(result).toBe(false);
    });

    it('should return false when time is after maxTime', () => {
      const constraints = { minTime: '09:00', maxTime: '14:00' };
      const result = isTimeInRange(sampleTime, constraints, 'HH:mm');
      expect(result).toBe(false);
    });

    it('should return true when time equals minTime', () => {
      const constraints = { minTime: '14:30', maxTime: '17:00' };
      const result = isTimeInRange(sampleTime, constraints, 'HH:mm');
      expect(result).toBe(true);
    });

    it('should return true when no constraints provided', () => {
      const result = isTimeInRange(sampleTime, {}, 'HH:mm');
      expect(result).toBe(true);
    });
  });

  describe('getSegmentConstraints', () => {
    it('should return correct constraints for hours in 24h format', () => {
      const currentTime: TimeValue = { hours: 12, minutes: 0, seconds: 0, period: 'AM' };
      const constraints = {};
      const result = getSegmentConstraints('hours', currentTime, constraints, 'HH:mm');

      expect(result.min).toBe(0);
      expect(result.max).toBe(23);
      expect(result.validValues).toEqual(Array.from({ length: 24 }, (_, i) => i));
    });

    it('should return correct constraints for hours in 12h format', () => {
      const currentTime: TimeValue = { hours: 12, minutes: 0, seconds: 0, period: 'AM' };
      const constraints = {};
      const result = getSegmentConstraints('hours', currentTime, constraints, 'hh:mm a');

      expect(result.min).toBe(1);
      expect(result.max).toBe(12);
      expect(result.validValues).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
    });

    it('should return constrained hours when minTime provided', () => {
      const currentTime: TimeValue = { hours: 12, minutes: 0, seconds: 0, period: 'AM' };
      const constraints = { minTime: '10:00', maxTime: '16:00' };
      const result = getSegmentConstraints('hours', currentTime, constraints, 'HH:mm');

      expect(result.validValues).toEqual([10, 11, 12, 13, 14, 15, 16]);
    });

    it('should return constrained minutes when on minTime hour', () => {
      const currentTime: TimeValue = { hours: 14, minutes: 0, seconds: 0, period: 'AM' };
      const constraints = { minTime: '14:30' };
      const result = getSegmentConstraints('minutes', currentTime, constraints, 'HH:mm');

      expect(result.validValues).toEqual(Array.from({ length: 30 }, (_, i) => i + 30));
    });

    it('should return full minute range when hour is between constraints', () => {
      const currentTime: TimeValue = { hours: 15, minutes: 0, seconds: 0, period: 'AM' };
      const constraints = { minTime: '14:30', maxTime: '16:15' };
      const result = getSegmentConstraints('minutes', currentTime, constraints, 'HH:mm');

      expect(result.validValues).toEqual(Array.from({ length: 60 }, (_, i) => i));
    });
  });

  describe('getNextValidValue', () => {
    it('should increment value when direction is up', () => {
      const constraints: SegmentConstraints = {
        min: 5,
        max: 15,
        validValues: [5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15],
      };
      const result = getNextValidValue(8, 'up', constraints);
      expect(result).toBe(9);
    });

    it('should decrement value when direction is down', () => {
      const constraints: SegmentConstraints = {
        min: 5,
        max: 15,
        validValues: [5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15],
      };
      const result = getNextValidValue(8, 'down', constraints);
      expect(result).toBe(7);
    });

    it('should return null when at max and going up', () => {
      const constraints: SegmentConstraints = {
        min: 5,
        max: 15,
        validValues: [5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15],
      };
      const result = getNextValidValue(15, 'up', constraints);
      expect(result).toBe(null);
    });

    it('should return null when at min and going down', () => {
      const constraints: SegmentConstraints = {
        min: 5,
        max: 15,
        validValues: [5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15],
      };
      const result = getNextValidValue(5, 'down', constraints);
      expect(result).toBe(null);
    });

    it('should skip invalid values and find next valid one', () => {
      const constraints: SegmentConstraints = {
        min: 5,
        max: 20,
        validValues: [5, 8, 12, 15, 20],
      };
      const result = getNextValidValue(5, 'up', constraints);
      expect(result).toBe(8);
    });
  });
});
