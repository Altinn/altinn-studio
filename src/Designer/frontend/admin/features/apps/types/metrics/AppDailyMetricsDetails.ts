import type { AppDailyMetricsSummaryRow } from './AppDailyMetricsSummary';

/**
 * The daily instance metrics of one app, summed over a period that ends on the last day the
 * nightly collection stored. Mirrors AppDailyMetricsDetails in the backend.
 */
export type AppDailyMetricsDetails = {
  periodDays: number;
  metricDate: string | null;
  observedSince: string | null;
  computedAt: string | null;
  metrics: AppDailyMetricsSummaryRow;
};
