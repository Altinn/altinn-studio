import type { AppFailedRequestDataPoint } from './AppFailedRequestDataPoint';

export type AppFailedRequest = {
  appName: string;
  dataPoints: AppFailedRequestDataPoint[];
};
