import type { SegmentType, TimeFormat, TimeValue } from 'src/app-components/TimePicker/types';

export const formatTimeValue = (time: TimeValue, format: TimeFormat): string => {
  const is12Hour = format.includes('a');
  const includesSeconds = format.includes('ss');

  const displayHours = is12Hour ? convertTo12HourDisplay(time.hours) : time.hours;
  const hoursStr = displayHours.toString().padStart(2, '0');
  const minutesStr = time.minutes.toString().padStart(2, '0');
  const secondsStr = includesSeconds ? `:${time.seconds.toString().padStart(2, '0')}` : '';
  const period = time.hours >= 12 ? 'PM' : 'AM';
  const periodStr = is12Hour ? ` ${period}` : '';

  return `${hoursStr}:${minutesStr}${secondsStr}${periodStr}`;
};

function convertTo12HourDisplay(hours: number): number {
  if (hours === 0) {
    return 12;
  }
  if (hours > 12) {
    return hours - 12;
  }
  return hours;
}

export const formatSegmentValue = (value: number | string, segmentType: SegmentType, format: TimeFormat): string => {
  if (segmentType === 'period') {
    return value.toString();
  }

  let numValue = typeof value === 'number' ? value : Number.parseInt(value, 10);
  if (Number.isNaN(numValue)) {
    numValue = 0;
  }
  if (segmentType === 'hours') {
    const is12Hour = format.includes('a');
    if (is12Hour) {
      const displayHour = convertTo12HourDisplay(numValue);
      return displayHour.toString().padStart(2, '0');
    }
  }
  return numValue.toString().padStart(2, '0');
};

export const parseSegmentInput = (
  input: string,
  segmentType: SegmentType,
  _format: TimeFormat,
): number | string | null => {
  if (!input.trim()) {
    return null;
  }

  if (segmentType === 'period') {
    const upperInput = input.toUpperCase();
    if (upperInput === 'AM' || upperInput === 'PM') {
      return upperInput as 'AM' | 'PM';
    }
    return null;
  }

  // Parse numeric input
  const numValue = parseInt(input, 10);
  if (isNaN(numValue)) {
    return null;
  }

  return numValue;
};

export const isValidSegmentInput = (input: string, segmentType: SegmentType, format: TimeFormat): boolean => {
  if (!input.trim()) {
    return false;
  }

  if (segmentType === 'period') {
    const upperInput = input.toUpperCase();
    return upperInput === 'AM' || upperInput === 'PM';
  }

  // Check if it contains only digits
  if (!/^\d+$/.test(input)) {
    return false;
  }

  const numValue = parseInt(input, 10);
  if (isNaN(numValue)) {
    return false;
  }

  // Single digits are always valid (will be auto-padded)
  if (input.length === 1) {
    return true;
  }

  // Validate complete values only
  if (segmentType === 'hours') {
    const is12Hour = format.includes('a');
    if (is12Hour) {
      return numValue >= 1 && numValue <= 12;
    } else {
      return numValue >= 0 && numValue <= 23;
    }
  }

  if (segmentType === 'minutes' || segmentType === 'seconds') {
    return numValue >= 0 && numValue <= 59;
  }

  return false;
};
