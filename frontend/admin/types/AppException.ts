import type { AppExceptionDataPoint } from './AppExceptionDataPoint';

export type AppException = {
  appName: string;
  dataPoints: AppExceptionDataPoint[];
};
