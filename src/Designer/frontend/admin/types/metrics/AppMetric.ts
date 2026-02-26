import type { AppMetricDataPoint } from './AppMetricDataPoint';

export type AppMetric = {
  name: string;
  dataPoints: AppMetricDataPoint[];
  logsUrl: string;
};
