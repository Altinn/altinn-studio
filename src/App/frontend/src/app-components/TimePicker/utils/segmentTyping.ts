import type { SegmentBuffer, SegmentType, SegmentTypingResult, TimeFormat } from 'src/app-components/TimePicker/types';

/**
 * Process hour input with Chrome-like smart coercion
 */
export const processHourInput = (digit: string, currentBuffer: string, is12Hour: boolean): SegmentTypingResult => {
  const digitNum = parseInt(digit, 10);

  if (currentBuffer === '') {
    // First digit
    if (is12Hour) {
      // 12-hour mode: 0-1 allowed, 2-9 coerced to 0X
      if (digitNum >= 0 && digitNum <= 1) {
        return { value: digit, shouldAdvance: false };
      } else {
        // Coerce 2-9 to 0X and advance
        return { value: `0${digit}`, shouldAdvance: true };
      }
    } else {
      // 24-hour mode: 0-2 allowed, 3-9 coerced to 0X
      if (digitNum >= 0 && digitNum <= 2) {
        return { value: digit, shouldAdvance: false };
      } else {
        // Coerce 3-9 to 0X and advance
        return { value: `0${digit}`, shouldAdvance: true };
      }
    }
  } else {
    // Second digit
    const firstDigit = parseInt(currentBuffer, 10);
    let finalValue: string;

    if (is12Hour) {
      if (firstDigit === 0) {
        // 01-09 valid, but 00 becomes 01
        finalValue = digitNum === 0 ? '01' : `0${digit}`;
      } else if (firstDigit === 1) {
        // 10-12 valid, >12 coerced to 12
        finalValue = digitNum > 2 ? '12' : `1${digit}`;
      } else {
        finalValue = `${currentBuffer}${digit}`;
      }
    } else {
      // 24-hour mode
      if (firstDigit === 2) {
        // If first digit is 2, restrict to 20-23, coerce >23 to 23
        finalValue = digitNum > 3 ? '23' : `2${digit}`;
      } else {
        finalValue = `${currentBuffer}${digit}`;
      }
    }

    return { value: finalValue, shouldAdvance: true };
  }
};

/**
 * Process minute/second input with coercion
 */
export const processMinuteInput = (digit: string, currentBuffer: string): SegmentTypingResult => {
  const digitNum = parseInt(digit, 10);

  if (currentBuffer === '') {
    // First digit: 0-5 allowed, 6-9 coerced to 0X
    if (digitNum >= 0 && digitNum <= 5) {
      return { value: digit, shouldAdvance: false };
    } else {
      // Coerce 6-9 to 0X (complete, but don't advance - Chrome behavior)
      return { value: `0${digit}`, shouldAdvance: false };
    }
  } else if (currentBuffer.length === 1) {
    // Second digit: always valid 0-9
    return { value: `${currentBuffer}${digit}`, shouldAdvance: false };
  } else {
    // Already has 2 digits - restart with new input
    if (digitNum >= 0 && digitNum <= 5) {
      return { value: digit, shouldAdvance: false };
    } else {
      // Coerce 6-9 to 0X
      return { value: `0${digit}`, shouldAdvance: false };
    }
  }
};

/**
 * Process period (AM/PM) input
 */
export const processPeriodInput = (key: string, currentPeriod: 'AM' | 'PM'): 'AM' | 'PM' => {
  const keyUpper = key.toUpperCase();
  if (keyUpper === 'A') {
    return 'AM';
  }
  if (keyUpper === 'P') {
    return 'PM';
  }
  return currentPeriod; // No change for invalid input
};

/**
 * Check if a key should trigger navigation
 */
export const isNavigationKey = (key: string): boolean =>
  [':', '.', ',', ' ', 'ArrowLeft', 'ArrowRight', 'Tab'].includes(key);

/**
 * Process segment buffer to get display and actual values
 */
export const processSegmentBuffer = (buffer: string, segmentType: SegmentType, _is12Hour: boolean): SegmentBuffer => {
  if (buffer === '') {
    return {
      displayValue: '--',
      actualValue: null,
      isComplete: false,
    };
  }

  if (segmentType === 'period') {
    return {
      displayValue: buffer,
      actualValue: buffer,
      isComplete: buffer === 'AM' || buffer === 'PM',
    };
  }
  const numValue = parseInt(buffer, 10);
  if (Number.isNaN(numValue)) {
    return {
      displayValue: '--',
      actualValue: null,
      isComplete: false,
    };
  }
  const displayValue = buffer.length === 1 ? `0${buffer}` : buffer;
  return {
    displayValue,
    actualValue: numValue,
    isComplete:
      buffer.length === 2 ||
      (buffer.length === 1 &&
        (numValue > 2 || ((segmentType === 'minutes' || segmentType === 'seconds') && numValue > 5))),
  };
};

/**
 * Clear a segment to empty state
 */
export const clearSegment = (): { displayValue: string; actualValue: null } => ({
  displayValue: '--',
  actualValue: null,
});

/**
 * Commit segment value (fill empty minutes with 00, etc.)
 */
export const commitSegmentValue = (segmentType: SegmentType, value: number | string | null): number | string => {
  if (value !== null) {
    return value;
  }

  if (segmentType === 'period') {
    return 'AM'; // Safe default for period
  }

  return 0; // Default for hours, minutes and seconds
};
/**
 * Handle character input for segment typing
 */
export const handleSegmentCharacterInput = (
  char: string,
  segmentType: SegmentType,
  currentBuffer: string,
  format: TimeFormat,
): {
  newBuffer: string;
  shouldAdvance: boolean;
  shouldNavigate: boolean;
} => {
  const is12Hour = format.includes('a');

  // Handle navigation characters
  if (isNavigationKey(char)) {
    return {
      newBuffer: currentBuffer,
      shouldAdvance: false,
      shouldNavigate: char === ':' || char === '.' || char === ',' || char === ' ',
    };
  }

  // Handle period segment
  if (segmentType === 'period') {
    const currentPeriod = currentBuffer === 'AM' || currentBuffer === 'PM' ? (currentBuffer as 'AM' | 'PM') : 'AM';
    const newPeriod = processPeriodInput(char, currentPeriod);
    return {
      newBuffer: newPeriod,
      shouldAdvance: false,
      shouldNavigate: false,
    };
  }

  // Handle numeric segments
  if (!/^\d$/.test(char)) {
    // Invalid character for numeric segment
    return {
      newBuffer: currentBuffer,
      shouldAdvance: false,
      shouldNavigate: false,
    };
  }

  let result: SegmentTypingResult;

  if (segmentType === 'hours') {
    result = processHourInput(char, currentBuffer, is12Hour);
  } else {
    result = processMinuteInput(char, currentBuffer);
  }

  return {
    newBuffer: result.value,
    shouldAdvance: result.shouldAdvance,
    shouldNavigate: false,
  };
};
