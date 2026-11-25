import type { TimeOption } from '../../types';

/**
 * Generates hour options for the timepicker dropdown
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
 */
export const generateMinuteOptions = (step: number = 1): TimeOption[] =>
  generateSecondOptions(step);
