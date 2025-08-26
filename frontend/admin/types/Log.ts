import type { LogDataPoint } from './LogDataPoint';

export type Log = {
  appName: string;
  dataPoints: LogDataPoint[];
};
