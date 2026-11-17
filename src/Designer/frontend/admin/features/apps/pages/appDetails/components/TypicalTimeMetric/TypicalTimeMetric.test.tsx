import { describe, expect, it, vi } from 'vitest';
import type { Mock } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClientProvider } from '@tanstack/react-query';
import axios from 'axios';
import type { AxiosStatic } from 'axios';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import { QueryKey } from 'app-shared/types/QueryKey';
import { textMock } from '@studio/testing/mocks/i18nMock';
import { app, org } from '@studio/testing/testids';
import { createApiErrorMock } from 'app-shared/mocks/apiErrorMock';
import { ServerCodes } from 'app-shared/enums/ServerCodes';
import { TypicalTimeMetric } from './TypicalTimeMetric';
import type { AppDailyMetricsDetails } from 'admin/features/apps/types/metrics/AppDailyMetricsDetails';
import { DEFAULT_SEARCH_PARAMS } from 'admin/constants/constants';

vi.mock('axios', async () => {
  const actual = await vi.importActual<{ default: AxiosStatic }>('axios');
  return { ...actual, default: { ...actual.default, get: vi.fn() } };
});

const env = 'production';
const days = DEFAULT_SEARCH_PARAMS.period;

const details = (
  secondsToCompleteP50: number | null,
  instancesCompleted = 4187,
): AppDailyMetricsDetails => ({
  periodDays: days,
  metricDate: '2026-11-10',
  observedSince: '2026-10-01',
  computedAt: '2026-11-11T02:30:00Z',
  metrics: {
    app,
    instancesCreated: 4812,
    instancesCreatedPreviousPeriod: 4310,
    instancesCompleted,
    secondsToCompleteP50,
    lastInstanceCreatedOn: '2026-11-10',
  },
});

describe('TypicalTimeMetric', () => {
  it('shows the median time and how many completions it builds on', () => {
    const queryClient = createQueryClientMock();
    queryClient.setQueryData([QueryKey.AppDailyMetricsDetails, org, env, app, days], details(660));

    renderTypicalTimeMetric(queryClient);

    expect(
      screen.getByText(textMock('admin.workflows.duration.minutes', { count: 11 })),
    ).toBeInTheDocument();
    expect(
      screen.getByText(textMock('admin.metrics.typical_time.note', { days, completed: '4 187' })),
    ).toBeInTheDocument();
  });

  it('says so when nothing completed in the period', () => {
    const queryClient = createQueryClientMock();
    queryClient.setQueryData(
      [QueryKey.AppDailyMetricsDetails, org, env, app, days],
      details(null, 0),
    );

    renderTypicalTimeMetric(queryClient);

    expect(
      screen.getByText(textMock('admin.metrics.typical_time.none', { days })),
    ).toBeInTheDocument();
  });

  it('shows an error when the numbers cannot be fetched', async () => {
    (axios.get as Mock).mockRejectedValue(createApiErrorMock(ServerCodes.InternalServerError));

    renderTypicalTimeMetric();

    await waitFor(() => {
      expect(screen.getByText(textMock('admin.metrics.typical_time.error'))).toBeInTheDocument();
    });
  });
});

const renderTypicalTimeMetric = (queryClient = createQueryClientMock()) =>
  render(
    <QueryClientProvider client={queryClient}>
      <TypicalTimeMetric org={org} environment={env} app={app} />
    </QueryClientProvider>,
  );
