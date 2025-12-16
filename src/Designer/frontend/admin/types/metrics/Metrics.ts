import type { Metric } from './Metric';

export type Metrics = {
  subscriptionId: string;
  metrics: Metric[];
};
