/**
 * Formats an hour value for display based on the time format
 * @param hour - The hour value (0-23)
 * @param is12Hour - Whether to use 12-hour format display
 * @returns The formatted hour value for display
 */
export const formatDisplayHour = (hour: number, is12Hour: boolean): number => {
  if (!is12Hour) {
    return hour;
  }

  // Convert 24-hour to 12-hour format
  if (hour === 0) {
    return 12; // Midnight (00:xx) -> 12:xx AM
  }

  if (hour > 12) {
    return hour - 12; // PM hours (13-23) -> 1-11 PM
  }

  return hour; // AM hours (1-12) stay the same
};
