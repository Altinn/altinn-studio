import type { Metric } from './Metric';

export type AppMetric = {
  appName: string;
  metrics: Metric[];
};
