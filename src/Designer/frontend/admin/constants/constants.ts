export const DEFAULT_SEARCH_PARAMS = {
  range: 1440,
  period: 30,
  environment: 'production',
};

/** The periods the daily metrics can be summed over, in days. */
export const PERIOD_OPTIONS_DAYS = [7, 30, 90];

/**
 * Errors on the apps list are always the last seven days: the gateway caps the range there, and the
 * daily table has no error history.
 */
export const ERROR_METRICS_RANGE_MINUTES = 7 * 24 * 60;

export function createSearchParams(obj: Record<string, unknown>) {
  const searchParams = new URLSearchParams(
    Object.fromEntries(
      Object.entries(obj)
        .filter(([k, v]) => v != null && v != DEFAULT_SEARCH_PARAMS[k])
        .map(([k, v]) => [k, JSON.stringify(v)]),
    ),
  ).toString();

  return !!searchParams ? `?${searchParams}` : '';
}
