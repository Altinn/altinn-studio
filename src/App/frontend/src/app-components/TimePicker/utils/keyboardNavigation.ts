import type {
  SegmentConstraints,
  SegmentNavigationResult,
  SegmentType,
  TimeFormat,
} from 'src/app-components/TimePicker/types';

export const handleSegmentKeyDown = (event: { key: string; preventDefault: () => void }): SegmentNavigationResult => {
  const { key } = event;

  switch (key) {
    case 'ArrowUp':
      event.preventDefault();
      return {
        shouldNavigate: false,
        shouldIncrement: true,
        preventDefault: true,
      };

    case 'ArrowDown':
      event.preventDefault();
      return {
        shouldNavigate: false,
        shouldDecrement: true,
        preventDefault: true,
      };

    case 'ArrowRight':
      event.preventDefault();
      return {
        shouldNavigate: true,
        direction: 'right',
        preventDefault: true,
      };

    case 'ArrowLeft':
      event.preventDefault();
      return {
        shouldNavigate: true,
        direction: 'left',
        preventDefault: true,
      };

    default:
      return {
        shouldNavigate: false,
        shouldIncrement: false,
        shouldDecrement: false,
        preventDefault: false,
      };
  }
};

export const getNextSegmentIndex = (
  currentIndex: number,
  direction: 'left' | 'right',
  segments: SegmentType[],
): number => {
  const segmentCount = segments.length;

  if (direction === 'right') {
    return (currentIndex + 1) % segmentCount;
  } else {
    return (currentIndex - 1 + segmentCount) % segmentCount;
  }
};

export const handleValueIncrement = (
  currentValue: number | string,
  segmentType: SegmentType,
  format: TimeFormat,
  constraints?: SegmentConstraints,
): number | string => {
  if (segmentType === 'period') {
    return currentValue === 'AM' ? 'PM' : 'AM';
  }

  const numValue = typeof currentValue === 'number' ? currentValue : 0;

  // If constraints provided, use them
  if (constraints) {
    const currentIndex = constraints.validValues.indexOf(numValue);
    if (currentIndex !== -1 && currentIndex < constraints.validValues.length - 1) {
      return constraints.validValues[currentIndex + 1];
    }
    return numValue; // Can't increment further
  }

  // Default increment logic with wrapping
  if (segmentType === 'hours') {
    const is12Hour = format.includes('a');
    if (is12Hour) {
      return numValue === 12 ? 1 : numValue + 1;
    } else {
      return numValue === 23 ? 0 : numValue + 1;
    }
  }

  if (segmentType === 'minutes' || segmentType === 'seconds') {
    return numValue === 59 ? 0 : numValue + 1;
  }

  return numValue;
};

export const handleValueDecrement = (
  currentValue: number | string,
  segmentType: SegmentType,
  format: TimeFormat,
  constraints?: SegmentConstraints,
): number | string => {
  if (segmentType === 'period') {
    return currentValue === 'PM' ? 'AM' : 'PM';
  }

  const numValue = typeof currentValue === 'number' ? currentValue : 0;

  // If constraints provided, use them
  if (constraints) {
    const currentIndex = constraints.validValues.indexOf(numValue);
    if (currentIndex > 0) {
      return constraints.validValues[currentIndex - 1];
    }
    return numValue; // Can't decrement further
  }

  // Default decrement logic with wrapping
  if (segmentType === 'hours') {
    const is12Hour = format.includes('a');
    if (is12Hour) {
      return numValue === 1 ? 12 : numValue - 1;
    } else {
      return numValue === 0 ? 23 : numValue - 1;
    }
  }

  if (segmentType === 'minutes' || segmentType === 'seconds') {
    return numValue === 0 ? 59 : numValue - 1;
  }

  return numValue;
};
