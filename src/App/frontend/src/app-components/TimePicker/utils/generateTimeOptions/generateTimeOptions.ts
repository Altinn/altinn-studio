import type { TimeOption } from 'src/app-components/TimePicker/types';

/**
 * Generates hour options for the timepicker dropdown
 * @param is12Hour - Whether to use 12-hour format (1-12) or 24-hour format (0-23)
 * @returns Array of hour options with value and label
 */
export const generateHourOptions = (is12Hour: boolean): TimeOption[] => {
  if (is12Hour) {
    return Array.from({ length: 12 }, (_, i) => ({
      value: i + 1,
      label: (i + 1).toString().padStart(2, '0'),
    }));
  }

  return Array.from({ length: 24 }, (_, i) => ({
    value: i,
    label: i.toString().padStart(2, '0'),
  }));
};

/**
 * Generates second options for the timepicker dropdown
 * @param step - Step increment for seconds (default: 1, common values: 1, 5, 15, 30)
 * @returns Array of second options with value and label
 */
export const generateSecondOptions = (step: number = 1): TimeOption[] => {
  const count = Math.floor(60 / step);

  return Array.from({ length: count }, (_, i) => {
    const value = i * step;
    return {
      value,
      label: value.toString().padStart(2, '0'),
    };
  });
};

/**
 * Generates minute options for the timepicker dropdown
 * @param step - Step increment for minutes (default: 1, common values: 1, 5, 15, 30)
 * @returns Array of minute options with value and label
 */
export const generateMinuteOptions = (step: number = 1): TimeOption[] => generateSecondOptions(step);
