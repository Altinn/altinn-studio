import type {
  NumericSegmentType,
  SegmentChangeResult,
  SegmentConstraints,
  SegmentType,
  TimeValue,
} from 'src/app-components/TimePicker/types';

/**
 * Handles period (AM/PM) changes by adjusting hours accordingly
 */
const handlePeriodChange = (newPeriod: 'AM' | 'PM', currentTimeValue: TimeValue): SegmentChangeResult => {
  let newHours = currentTimeValue.hours;

  if (newPeriod === 'PM' && currentTimeValue.hours < 12) {
    newHours += 12;
  }

  if (newPeriod === 'AM' && currentTimeValue.hours >= 12) {
    newHours -= 12;
  }

  return {
    updatedTimeValue: { period: newPeriod, hours: newHours },
  };
};

/**
 * Wraps hour values based on 12/24 hour format
 */
const wrapHours = (value: number, is12Hour: boolean): number => {
  if (is12Hour) {
    if (value > 12) {
      return 1;
    }
    if (value < 1) {
      return 12;
    }
    return value;
  }

  if (value > 23) {
    return 0;
  }
  if (value < 0) {
    return 23;
  }
  return value;
};

/**
 * Wraps minutes/seconds values (0-59)
 */
const wrapMinutesSeconds = (value: number): number => {
  if (value > 59) {
    return 0;
  }
  if (value < 0) {
    return 59;
  }
  return value;
};

/**
 * Wraps numeric values within valid ranges for different segment types
 */
const wrapNumericValue = (value: number, segmentType: NumericSegmentType, is12Hour: boolean): number => {
  switch (segmentType) {
    case 'hours':
      return wrapHours(value, is12Hour);
    case 'minutes':
    case 'seconds':
      return wrapMinutesSeconds(value);
  }
};

/**
 * Finds the nearest valid value from constraints
 */
const findNearestValidValue = (targetValue: number, validValues: number[]): number => {
  if (validValues.length === 0) {
    return targetValue;
  }
  return validValues.reduce((prev, curr) =>
    Math.abs(curr - targetValue) < Math.abs(prev - targetValue) ? curr : prev,
  );
};

/**
 * Handles numeric segment changes with validation and wrapping
 */
const handleNumericSegmentChange = (
  segmentType: NumericSegmentType,
  value: number,
  segmentConstraints: SegmentConstraints,
  is12Hour: boolean,
): SegmentChangeResult => {
  const wrappedValue = wrapNumericValue(value, segmentType, is12Hour);

  // Return wrapped value if it's within constraints
  if (segmentConstraints.validValues.includes(wrappedValue)) {
    return {
      updatedTimeValue: { [segmentType]: wrappedValue },
    };
  }

  // Find and return nearest valid value
  const nearestValid = findNearestValidValue(wrappedValue, segmentConstraints.validValues);
  return {
    updatedTimeValue: { [segmentType]: nearestValid },
  };
};

/**
 * Handles changes to time segments with proper validation and wrapping
 */
export const handleSegmentValueChange = (
  segmentType: SegmentType,
  newValue: number | string,
  currentTimeValue: TimeValue,
  segmentConstraints: SegmentConstraints,
  is12Hour: boolean,
): SegmentChangeResult => {
  // Handle period changes
  if (segmentType === 'period' && typeof newValue === 'string') {
    return handlePeriodChange(newValue as 'AM' | 'PM', currentTimeValue);
  }

  // Handle numeric segments
  if (segmentType !== 'period' && typeof newValue === 'number') {
    return handleNumericSegmentChange(segmentType, newValue, segmentConstraints, is12Hour);
  }

  // Invalid combination - should not happen with proper typing
  throw new Error(`Invalid combination: segmentType ${segmentType} with value type ${typeof newValue}`);
};
