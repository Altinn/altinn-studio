import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { isAxiosError } from 'axios';
import { StudioAlert, StudioError, StudioSpinner } from '@studio/components';
import type { UseQueryResult } from '@tanstack/react-query';
import type { PlatformAppDailyMetrics } from 'admin/features/platform/types/PlatformAppDailyMetrics';

export type PlatformMetricsStateProps = {
  query: UseQueryResult<PlatformAppDailyMetrics>;
  children: (metrics: PlatformAppDailyMetrics) => ReactNode;
};

/** Loading, access and error states shared by the two platform pages. */
export const PlatformMetricsState = ({ query, children }: PlatformMetricsStateProps) => {
  const { t } = useTranslation();
  if (query.isPending) {
    return <StudioSpinner aria-label={t('admin.platform.metrics.loading')} />;
  }
  if (query.isError) {
    return isAxiosError(query.error) && query.error.response?.status === 403 ? (
      <StudioAlert data-color='info'>{t('admin.platform.missing_rights')}</StudioAlert>
    ) : (
      <StudioError>{t('admin.platform.metrics.error')}</StudioError>
    );
  }
  return <>{children(query.data)}</>;
};
