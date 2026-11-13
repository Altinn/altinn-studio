/**
 * The daily instance metrics of every app of an org in one environment, summed over a period that
 * ends on the last day the nightly collection stored. Mirrors AppDailyMetricsSummary in the backend.
 */
export type AppDailyMetricsSummary = {
  periodDays: number;
  /** The last day with stored metrics, as yyyy-MM-dd. Null when nothing is stored yet. */
  metricDate: string | null;
  /** The first day with stored metrics, as yyyy-MM-dd. */
  observedSince: string | null;
  /** When Storage computed the most recently collected day. */
  computedAt: string | null;
  apps: AppDailyMetricsSummaryRow[];
};

export type AppDailyMetricsSummaryRow = {
  app: string;
  instancesCreated: number;
  instancesCreatedPreviousPeriod: number;
  instancesCompleted: number;
  /** Typical seconds from process start to end in the period. Null when none completed. */
  secondsToCompleteP50: number | null;
  /** The last day an instance was created, as yyyy-MM-dd, over everything stored. */
  lastInstanceCreatedOn: string | null;
};
