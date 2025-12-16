import type { MetricApp } from './MetricApp';

export type Metric = {
  name: string;
  operationNames: string[];
  apps: MetricApp[];
};
