import type { SegmentConstraints, TimeConstraints, TimeFormat, TimeValue } from 'src/app-components/TimePicker/types';

export const parseTimeString = (timeStr: string, format: TimeFormat): TimeValue => {
  const is12Hour = format.includes('a');
  const defaultValue: TimeValue = {
    hours: 0,
    minutes: 0,
    seconds: 0,
    period: is12Hour ? 'AM' : undefined,
  };

  if (!timeStr) {
    return defaultValue;
  }

  const includesSeconds = format.includes('ss');

  const parts = timeStr.replace(/\s*(AM|PM)/i, '').split(':');
  const periodMatch = timeStr.match(/(AM|PM)/i);

  const hours = parseInt(parts[0] || '0', 10);
  const minutes = parseInt(parts[1] || '0', 10);
  const seconds = includesSeconds ? parseInt(parts[2] || '0', 10) : 0;
  const period = periodMatch ? (periodMatch[1].toUpperCase() as 'AM' | 'PM') : 'AM';

  let actualHours = isNaN(hours) ? 0 : hours;

  // Convert 12-hour to 24-hour for internal representation
  if (is12Hour) {
    if (period === 'AM' && actualHours === 12) {
      actualHours = 0; // 12 AM = 0
    } else if (period === 'PM' && actualHours !== 12) {
      actualHours += 12; // PM hours except 12 PM
    }
  }

  return {
    hours: actualHours,
    minutes: isNaN(minutes) ? 0 : minutes,
    seconds: isNaN(seconds) ? 0 : seconds,
    period: is12Hour ? period : undefined,
  };
};

export const isTimeInRange = (time: TimeValue, constraints: TimeConstraints, format: TimeFormat): boolean => {
  if (!constraints.minTime && !constraints.maxTime) {
    return true;
  }

  const timeInMinutes = time.hours * 60 + time.minutes;
  const timeInSeconds = timeInMinutes * 60 + time.seconds;

  let minInSeconds = 0;
  let maxInSeconds = 24 * 60 * 60 - 1;

  if (constraints.minTime) {
    const minTime = parseTimeString(constraints.minTime, format);
    minInSeconds = minTime.hours * 3600 + minTime.minutes * 60 + minTime.seconds;
  }

  if (constraints.maxTime) {
    const maxTime = parseTimeString(constraints.maxTime, format);
    maxInSeconds = maxTime.hours * 3600 + maxTime.minutes * 60 + maxTime.seconds;
  }

  return timeInSeconds >= minInSeconds && timeInSeconds <= maxInSeconds;
};

export const getSegmentConstraints = (
  segmentType: 'hours' | 'minutes' | 'seconds',
  currentTime: TimeValue,
  constraints: TimeConstraints,
  format: TimeFormat,
): SegmentConstraints => {
  const is12Hour = format.includes('a');

  if (segmentType === 'hours') {
    let min = is12Hour ? 1 : 0;
    let max = is12Hour ? 12 : 23;
    const validValues: number[] = [];

    // Parse constraints if they exist
    if (constraints.minTime || constraints.maxTime) {
      const minTime = constraints.minTime ? parseTimeString(constraints.minTime, format) : null;
      const maxTime = constraints.maxTime ? parseTimeString(constraints.maxTime, format) : null;

      if (minTime) {
        min = Math.max(
          min,
          is12Hour
            ? minTime.hours === 0
              ? 12
              : minTime.hours > 12
                ? minTime.hours - 12
                : minTime.hours
            : minTime.hours,
        );
      }
      if (maxTime) {
        max = Math.min(
          max,
          is12Hour
            ? maxTime.hours === 0
              ? 12
              : maxTime.hours > 12
                ? maxTime.hours - 12
                : maxTime.hours
            : maxTime.hours,
        );
      }
    }

    for (let i = min; i <= max; i++) {
      validValues.push(i);
    }

    return { min, max, validValues };
  }

  if (segmentType === 'minutes') {
    let min = 0;
    let max = 59;
    const validValues: number[] = [];

    // Check if current hour matches constraint boundaries
    if (constraints.minTime) {
      const minTime = parseTimeString(constraints.minTime, format);
      if (currentTime.hours === minTime.hours) {
        min = minTime.minutes;
      }
    }

    if (constraints.maxTime) {
      const maxTime = parseTimeString(constraints.maxTime, format);
      if (currentTime.hours === maxTime.hours) {
        max = maxTime.minutes;
      }
    }

    for (let i = min; i <= max; i++) {
      validValues.push(i);
    }

    return { min, max, validValues };
  }

  if (segmentType === 'seconds') {
    let min = 0;
    let max = 59;
    const validValues: number[] = [];

    // Check if current hour and minute match constraint boundaries
    if (constraints.minTime) {
      const minTime = parseTimeString(constraints.minTime, format);
      if (currentTime.hours === minTime.hours && currentTime.minutes === minTime.minutes) {
        min = minTime.seconds;
      }
    }

    if (constraints.maxTime) {
      const maxTime = parseTimeString(constraints.maxTime, format);
      if (currentTime.hours === maxTime.hours && currentTime.minutes === maxTime.minutes) {
        max = maxTime.seconds;
      }
    }

    for (let i = min; i <= max; i++) {
      validValues.push(i);
    }

    return { min, max, validValues };
  }

  // Default fallback
  return { min: 0, max: 59, validValues: Array.from({ length: 60 }, (_, i) => i) };
};

export const getNextValidValue = (
  currentValue: number,
  direction: 'up' | 'down',
  constraints: SegmentConstraints,
): number | null => {
  const { validValues } = constraints;
  const currentIndex = validValues.indexOf(currentValue);

  if (currentIndex === -1) {
    // Current value is not in valid values, find nearest
    if (direction === 'up') {
      const nextValid = validValues.find((v) => v > currentValue);
      return nextValid ?? null;
    } else {
      const prevValid = validValues
        .slice()
        .reverse()
        .find((v) => v < currentValue);
      return prevValid ?? null;
    }
  }

  if (direction === 'up') {
    const nextIndex = currentIndex + 1;
    return nextIndex < validValues.length ? validValues[nextIndex] : null;
  } else {
    const prevIndex = currentIndex - 1;
    return prevIndex >= 0 ? validValues[prevIndex] : null;
  }
};
