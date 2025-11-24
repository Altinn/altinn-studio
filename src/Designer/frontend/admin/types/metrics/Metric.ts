import type { MetricDataPoint } from './MetricDataPoint';

export type Metric = {
  name: string;
  dataPoints: MetricDataPoint[];
  count: number;
  threshold?: number;
};
