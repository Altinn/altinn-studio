import type { PlatformAppDailyMetrics } from 'admin/features/platform/types/PlatformAppDailyMetrics';
import type { AppDailyMetricsSummaryRow } from 'admin/features/apps/types/metrics/AppDailyMetricsSummary';

const row = (
  app: string,
  overrides: Partial<AppDailyMetricsSummaryRow> = {},
): AppDailyMetricsSummaryRow => ({
  app,
  instancesCreated: 0,
  instancesCreatedPreviousPeriod: 0,
  instancesCompleted: 0,
  secondsToCompleteP50: null,
  lastInstanceCreatedOn: null,
  ...overrides,
});

/** Two service owners on 10 November 2026: skd collected last night, ttd one night earlier. */
export const platformMetricsMock: PlatformAppDailyMetrics = {
  environment: 'production',
  periodDays: 30,
  metricDate: '2026-11-10',
  serviceOwners: [
    {
      org: 'skd',
      observedSince: '2026-05-01',
      latestMetricDate: '2026-11-10',
      computedAt: '2026-11-11T02:30:00Z',
      apps: [
        row('mva-melding', {
          instancesCreated: 4000,
          instancesCreatedPreviousPeriod: 3800,
          instancesCompleted: 3600,
          lastInstanceCreatedOn: '2026-11-10',
        }),
        row('gammel-pilot', { lastInstanceCreatedOn: '2026-03-01' }),
      ],
    },
    {
      org: 'ttd',
      observedSince: '2026-05-01',
      latestMetricDate: '2026-11-09',
      computedAt: '2026-11-10T02:30:00Z',
      apps: [
        row('skjema-for-byggesoknad', {
          instancesCreated: 500,
          instancesCreatedPreviousPeriod: 600,
          instancesCompleted: 450,
          lastInstanceCreatedOn: '2026-11-09',
        }),
      ],
    },
  ],
};
