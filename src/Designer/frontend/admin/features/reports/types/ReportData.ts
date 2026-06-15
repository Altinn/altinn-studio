import type { AppMetric } from 'admin/features/apps/types/metrics/AppMetric';

export type AppReportData = {
  appName: string;
  metrics: AppMetric[];
  errorMetrics: AppMetric[];
};

export type ReportData = {
  org: string;
  environment: string;
  from: string;
  to: string;
  apps: AppReportData[];
};
