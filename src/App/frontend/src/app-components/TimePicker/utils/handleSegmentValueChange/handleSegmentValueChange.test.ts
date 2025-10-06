import { SegmentConstraints, TimeValue } from 'src/app-components/TimePicker/types';
import { handleSegmentValueChange } from 'src/app-components/TimePicker/utils/handleSegmentValueChange/handleSegmentValueChange';

describe('handleSegmentValueChange', () => {
  const mockTimeValue: TimeValue = {
    hours: 14,
    minutes: 30,
    seconds: 45,
    period: 'PM',
  };

  const mockConstraints: SegmentConstraints = {
    min: 0,
    max: 59,
    validValues: [0, 15, 30, 45], // 15-minute intervals for testing
  };

  describe('period changes', () => {
    it('should convert PM to AM by subtracting 12 from hours >= 12', () => {
      const result = handleSegmentValueChange('period', 'AM', mockTimeValue, mockConstraints, true);

      expect(result.updatedTimeValue).toEqual({
        period: 'AM',
        hours: 2, // 14 - 12 = 2
      });
    });

    it('should convert AM to PM by adding 12 to hours < 12', () => {
      const timeValue: TimeValue = { hours: 10, minutes: 30, seconds: 45, period: 'AM' };

      const result = handleSegmentValueChange('period', 'PM', timeValue, mockConstraints, true);

      expect(result.updatedTimeValue).toEqual({
        period: 'PM',
        hours: 22, // 10 + 12 = 22
      });
    });

    it('should not change hours when converting PM to AM for hours < 12', () => {
      const timeValue: TimeValue = { hours: 2, minutes: 30, seconds: 45, period: 'PM' };

      const result = handleSegmentValueChange('period', 'AM', timeValue, mockConstraints, true);

      expect(result.updatedTimeValue).toEqual({
        period: 'AM',
        hours: 2, // No change needed
      });
    });

    it('should not change hours when converting AM to PM for hours >= 12', () => {
      const timeValue: TimeValue = { hours: 15, minutes: 30, seconds: 45, period: 'AM' };

      const result = handleSegmentValueChange('period', 'PM', timeValue, mockConstraints, true);

      expect(result.updatedTimeValue).toEqual({
        period: 'PM',
        hours: 15, // No change needed
      });
    });
  });

  describe('hours wrapping', () => {
    const hoursConstraints: SegmentConstraints = {
      min: 1,
      max: 12,
      validValues: Array.from({ length: 12 }, (_, i) => i + 1), // 1-12
    };

    describe('12-hour format', () => {
      it('should wrap hours > 12 to 1', () => {
        const result = handleSegmentValueChange('hours', 15, mockTimeValue, hoursConstraints, true);

        expect(result.updatedTimeValue).toEqual({ hours: 1 });
      });

      it('should wrap hours < 1 to 12', () => {
        const result = handleSegmentValueChange('hours', 0, mockTimeValue, hoursConstraints, true);

        expect(result.updatedTimeValue).toEqual({ hours: 12 });
      });

      it('should keep valid hours unchanged', () => {
        const result = handleSegmentValueChange('hours', 8, mockTimeValue, hoursConstraints, true);

        expect(result.updatedTimeValue).toEqual({ hours: 8 });
      });
    });

    describe('24-hour format', () => {
      const hours24Constraints: SegmentConstraints = {
        min: 0,
        max: 23,
        validValues: Array.from({ length: 24 }, (_, i) => i), // 0-23
      };

      it('should wrap hours > 23 to 0', () => {
        const result = handleSegmentValueChange('hours', 25, mockTimeValue, hours24Constraints, false);

        expect(result.updatedTimeValue).toEqual({ hours: 0 });
      });

      it('should wrap hours < 0 to 23', () => {
        const result = handleSegmentValueChange('hours', -1, mockTimeValue, hours24Constraints, false);

        expect(result.updatedTimeValue).toEqual({ hours: 23 });
      });

      it('should keep valid hours unchanged', () => {
        const result = handleSegmentValueChange('hours', 15, mockTimeValue, hours24Constraints, false);

        expect(result.updatedTimeValue).toEqual({ hours: 15 });
      });
    });
  });

  describe('minutes wrapping', () => {
    const minutesConstraints: SegmentConstraints = {
      min: 0,
      max: 59,
      validValues: Array.from({ length: 60 }, (_, i) => i), // 0-59
    };

    it('should wrap minutes > 59 to 0', () => {
      const result = handleSegmentValueChange('minutes', 65, mockTimeValue, minutesConstraints, true);

      expect(result.updatedTimeValue).toEqual({ minutes: 0 });
    });

    it('should wrap minutes < 0 to 59', () => {
      const result = handleSegmentValueChange('minutes', -1, mockTimeValue, minutesConstraints, true);

      expect(result.updatedTimeValue).toEqual({ minutes: 59 });
    });

    it('should keep valid minutes unchanged', () => {
      const result = handleSegmentValueChange('minutes', 45, mockTimeValue, minutesConstraints, true);

      expect(result.updatedTimeValue).toEqual({ minutes: 45 });
    });
  });

  describe('seconds wrapping', () => {
    const secondsConstraints: SegmentConstraints = {
      min: 0,
      max: 59,
      validValues: Array.from({ length: 60 }, (_, i) => i), // 0-59
    };

    it('should wrap seconds > 59 to 0', () => {
      const result = handleSegmentValueChange('seconds', 72, mockTimeValue, secondsConstraints, true);

      expect(result.updatedTimeValue).toEqual({ seconds: 0 });
    });

    it('should wrap seconds < 0 to 59', () => {
      const result = handleSegmentValueChange('seconds', -1, mockTimeValue, secondsConstraints, true);

      expect(result.updatedTimeValue).toEqual({ seconds: 59 });
    });

    it('should keep valid seconds unchanged', () => {
      const result = handleSegmentValueChange('seconds', 20, mockTimeValue, secondsConstraints, true);

      expect(result.updatedTimeValue).toEqual({ seconds: 20 });
    });
  });

  describe('constraint validation', () => {
    it('should find nearest valid value when wrapped value is not in constraints', () => {
      const result = handleSegmentValueChange(
        'minutes',
        22, // Not in validValues [0, 15, 30, 45]
        mockTimeValue,
        mockConstraints,
        true,
      );

      expect(result.updatedTimeValue).toEqual({ minutes: 15 }); // Nearest valid value
    });

    it('should find nearest valid value on the higher side', () => {
      const result = handleSegmentValueChange(
        'minutes',
        37, // Closer to 30 than 45
        mockTimeValue,
        mockConstraints,
        true,
      );

      expect(result.updatedTimeValue).toEqual({ minutes: 30 });
    });

    it('should find nearest valid value on the lower side', () => {
      const result = handleSegmentValueChange(
        'minutes',
        38, // Closer to 45 than 30
        mockTimeValue,
        mockConstraints,
        true,
      );

      expect(result.updatedTimeValue).toEqual({ minutes: 45 });
    });
  });

  describe('error handling', () => {
    it('should throw error for invalid segment type and value type combination', () => {
      expect(() => {
        handleSegmentValueChange(
          'period',
          123, // number instead of string
          mockTimeValue,
          mockConstraints,
          true,
        );
      }).toThrow('Invalid combination: segmentType period with value type number');
    });

    it('should throw error for numeric segment with string value', () => {
      expect(() => {
        handleSegmentValueChange(
          'hours',
          'invalid', // string instead of number
          mockTimeValue,
          mockConstraints,
          true,
        );
      }).toThrow('Invalid combination: segmentType hours with value type string');
    });
  });
});
