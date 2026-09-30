/**
 * Normalizes hour values for validation by converting 12-hour format to 24-hour format.
 * For 24-hour format, returns the value unchanged.
 */
export function normalizeHour(optionValue: number, is12Hour: boolean, period: 'AM' | 'PM'): number {
  if (!is12Hour) {
    return optionValue;
  }

  if (optionValue === 12) {
    return period === 'AM' ? 0 : 12;
  }

  return period === 'PM' ? optionValue + 12 : optionValue;
}
