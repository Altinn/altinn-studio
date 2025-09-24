/**
 * Normalizes hour values for validation by converting 12-hour format to 24-hour format.
 * For 24-hour format, returns the value unchanged.
 *
 * @param optionValue - The hour value from the dropdown option (1-12 for 12-hour, 0-23 for 24-hour)
 * @param is12Hour - Whether the time format is 12-hour or 24-hour
 * @param period - The AM/PM period (only used for 12-hour format)
 * @returns The normalized hour value in 24-hour format (0-23)
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
