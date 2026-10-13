export const MIN_INACTIVITY_PERIOD_DAYS = 7;
export const MAX_INACTIVITY_PERIOD_DAYS = 365;

const wholeNumberPattern = /^\d+$/;

export function parseInactivityPeriodDays(value: string): number | null {
  const trimmedValue = value.trim();
  if (!wholeNumberPattern.test(trimmedValue)) {
    return null;
  }
  const days = Number(trimmedValue);
  const isWithinRange = days >= MIN_INACTIVITY_PERIOD_DAYS && days <= MAX_INACTIVITY_PERIOD_DAYS;
  return isWithinRange ? days : null;
}
