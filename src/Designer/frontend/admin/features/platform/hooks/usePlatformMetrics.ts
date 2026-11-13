import { useOutletContext } from 'react-router-dom';
import type { UseQueryResult } from '@tanstack/react-query';
import type { PlatformOutletContext } from 'admin/features/platform/layout/PlatformLayout';
import type { PlatformAppDailyMetrics } from 'admin/features/platform/types/PlatformAppDailyMetrics';
import { usePlatformAppDailyMetricsQuery } from './queries/usePlatformAppDailyMetricsQuery';

/** The environment and period the layout chose, and the platform metrics for them. */
export const usePlatformMetrics = (): PlatformOutletContext & {
  query: UseQueryResult<PlatformAppDailyMetrics>;
} => {
  const context = useOutletContext<PlatformOutletContext>();
  const query = usePlatformAppDailyMetricsQuery(context.environment, context.periodDays, {
    hideDefaultError: true,
  });
  return { ...context, query };
};
