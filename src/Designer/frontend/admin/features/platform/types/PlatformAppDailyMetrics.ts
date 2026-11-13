import type { AppDailyMetricsSummaryRow } from 'admin/features/apps/types/metrics/AppDailyMetricsSummary';

/**
 * The daily instance metrics of every app of every service owner in one environment. The period
 * ends on the last day any service owner has stored metrics for. Mirrors PlatformAppDailyMetrics
 * in the backend.
 */
export type PlatformAppDailyMetrics = {
  environment: string;
  periodDays: number;
  /** The last day with stored metrics for any service owner, as yyyy-MM-dd. */
  metricDate: string | null;
  serviceOwners: ServiceOwnerAppDailyMetrics[];
};

export type ServiceOwnerAppDailyMetrics = {
  org: string;
  observedSince: string;
  /** The service owner's own last stored day. Earlier than the platform's when its collection failed. */
  latestMetricDate: string;
  /** When Storage computed the service owner's most recently collected day. */
  computedAt: string;
  apps: AppDailyMetricsSummaryRow[];
};
