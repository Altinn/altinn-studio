import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Mock } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { AppsTable, type AppsTableProps } from './AppsTable';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import { QueryKey } from 'app-shared/types/QueryKey';
import { QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { textMock } from '@studio/testing/mocks/i18nMock';
import { app, org } from '@studio/testing/testids';
import { createApiErrorMock } from 'app-shared/mocks/apiErrorMock';
import { ServerCodes } from 'app-shared/enums/ServerCodes';
import axios from 'axios';
import type { AxiosStatic } from 'axios';
import userEvent from '@testing-library/user-event';
import { useQueryParamState } from 'admin/features/apps/hooks/useQueryParamState';
import { OrgContext } from 'admin/contexts/OrgContext';
import { DEFAULT_SEARCH_PARAMS, ERROR_METRICS_RANGE_MINUTES } from 'admin/constants/constants';
import type { AppDailyMetricsSummary } from 'admin/features/apps/types/metrics/AppDailyMetricsSummary';

const range = ERROR_METRICS_RANGE_MINUTES;
const period = DEFAULT_SEARCH_PARAMS.period;
const env = 'production';
const envTitle = textMock('general.production_environment_alt').toLowerCase();
const orgFullName = 'Test Org Full Name';

const orgMock = {
  username: org,
  full_name: orgFullName,
  avatar_url: '',
  id: 1,
};

const orgMockWithoutFullName = {
  username: org,
  full_name: '',
  avatar_url: '',
  id: 1,
};

const defaultProps: AppsTableProps = {
  org,
};

vi.mock('axios', async () => {
  const actual = await vi.importActual<{ default: AxiosStatic }>('axios');
  return { ...actual, default: { ...actual.default, get: vi.fn() } };
});
vi.mock('admin/features/apps/hooks/useQueryParamState');

const mockSetPeriod = vi.fn();
const mockSetEnvironment = vi.fn();

describe('AppsTable', () => {
  beforeEach(() => {
    vi.mocked(useQueryParamState).mockImplementation((key, defaultValue) => {
      if (key === 'period') {
        return [period, mockSetPeriod];
      }
      if (key === 'environment') {
        return [defaultValue, mockSetEnvironment];
      }
      return [defaultValue, vi.fn()];
    });
  });

  describe('Metrics', () => {
    it('should render loading state', () => {
      const queryClient = createQueryClientMock();

      queryClient.setQueryData([QueryKey.PublishedApps, org], {
        production: [
          {
            app,
            env,
            org,
            version: '1',
          },
        ],
      });

      renderAppsTable(queryClient);

      expect(screen.getByLabelText(textMock('admin.apps.metrics.loading'))).toBeInTheDocument();
    });

    it('should render error state with danger alert for non-403 errors', async () => {
      const axiosError = createApiErrorMock(ServerCodes.InternalServerError);
      (axios.get as Mock).mockRejectedValue(axiosError);

      const queryClient = createQueryClientMock();

      queryClient.setQueryData([QueryKey.PublishedApps, org], {
        production: [
          {
            app,
            env,
            org,
            version: '1',
          },
        ],
      });

      renderAppsTable(queryClient);

      await waitFor(() => {
        expect(
          screen.queryByLabelText(textMock('admin.apps.metrics.loading')),
        ).not.toBeInTheDocument();
      });

      expect(screen.getByText(textMock('admin.metrics.errors.error'))).toBeInTheDocument();
    });

    it('should render info alert when missing rights', async () => {
      const axiosError = createApiErrorMock(ServerCodes.Forbidden);
      (axios.get as Mock).mockRejectedValue(axiosError);

      const queryClient = createQueryClientMock();

      queryClient.setQueryData([QueryKey.PublishedApps, org], {
        production: [
          {
            app,
            env,
            org,
            version: '1',
          },
        ],
      });

      renderAppsTable(queryClient);

      await waitFor(() => {
        expect(
          screen.queryByLabelText(textMock('admin.apps.metrics.loading')),
        ).not.toBeInTheDocument();
      });

      expect(
        screen.getByText(
          textMock('admin.metrics.errors.missing_rights', { envTitle, orgName: orgFullName }),
        ),
      ).toBeInTheDocument();
    });

    it('should use org username when full name is missing in missing rights alert', async () => {
      const axiosError = createApiErrorMock(ServerCodes.Forbidden);
      (axios.get as Mock).mockRejectedValue(axiosError);

      const queryClient = createQueryClientMock();

      queryClient.setQueryData([QueryKey.PublishedApps, org], {
        production: [
          {
            app,
            env,
            org,
            version: '1',
          },
        ],
      });

      renderAppsTable(queryClient, defaultProps, orgMockWithoutFullName);

      await waitFor(() => {
        expect(
          screen.queryByLabelText(textMock('admin.apps.metrics.loading')),
        ).not.toBeInTheDocument();
      });

      expect(
        screen.getByText(
          textMock('admin.metrics.errors.missing_rights', { envTitle, orgName: org }),
        ),
      ).toBeInTheDocument();
    });

    it('should render error metrics', () => {
      const queryClient = createQueryClientMock();

      queryClient.setQueryData([QueryKey.PublishedApps, org], {
        production: [
          {
            app,
            env,
            org,
            version: '1',
          },
        ],
      });

      const mockData = [
        {
          name: 'failed_process_next_requests',
          appName: app,
          count: 22.0,
        },
        {
          name: 'failed_instance_creation_requests',
          appName: app,
          count: 5.0,
        },
      ];

      queryClient.setQueryData([QueryKey.ErrorMetrics, org, env, range], mockData);

      renderAppsTable(queryClient);

      mockData.forEach((metric) => {
        const metricElement = screen.getByText(textMock(`admin.metrics.${metric.name}`));
        expect(metricElement).toBeInTheDocument();
      });
    });
  });

  describe('environment fallback', () => {
    beforeEach(() => {
      vi.mocked(useQueryParamState).mockImplementation((key, defaultValue) => {
        if (key === 'range') return [1440, mockSetPeriod];
        if (key === 'environment') return ['production', mockSetEnvironment];
        return [defaultValue, vi.fn()];
      });
    });

    it('should render the first available environment and update selectedEnvironment when it is not available', () => {
      const queryClient = createQueryClientMock();
      queryClient.setQueryData([QueryKey.PublishedApps, org], {
        tt02: [{ app, env: 'tt02', org, version: '1' }],
      });

      renderAppsTable(queryClient);

      expect(screen.getByRole('tab', { name: /tt02/i })).toBeInTheDocument();
      expect(screen.queryByLabelText(textMock('general.loading'))).not.toBeInTheDocument();
      expect(mockSetEnvironment).toHaveBeenCalledWith('tt02');
    });
  });

  it('should change period when selecting a new period', async () => {
    const user = userEvent.setup();

    const queryClient = createQueryClientMock();

    queryClient.setQueryData([QueryKey.PublishedApps, org], {
      production: [
        {
          app,
          env,
          org,
          version: '1',
        },
      ],
    });

    const mockData = [
      {
        name: 'failed_process_next_requests',
        appName: app,
        count: 22.0,
      },
      {
        name: 'failed_instance_creation_requests',
        appName: app,
        count: 5.0,
      },
    ];

    queryClient.setQueryData([QueryKey.ErrorMetrics, org, env, range], mockData);

    renderAppsTable(queryClient);

    const select = screen.getByRole('combobox', { name: textMock('admin.apps.period') });
    await user.selectOptions(select, '90');

    expect(mockSetPeriod).toHaveBeenCalledWith(90);
  });

  describe('Daily metrics', () => {
    const dailyMetrics: AppDailyMetricsSummary = {
      periodDays: period,
      metricDate: '2026-11-10',
      observedSince: '2026-10-01',
      computedAt: '2026-11-11T02:30:00Z',
      apps: [
        {
          app,
          instancesCreated: 120,
          instancesCreatedPreviousPeriod: 100,
          instancesCompleted: 90,
          secondsToCompleteP50: 660,
          lastInstanceCreatedOn: '2026-11-10',
        },
        {
          app: 'idle-app',
          instancesCreated: 0,
          instancesCreatedPreviousPeriod: 0,
          instancesCompleted: 0,
          secondsToCompleteP50: null,
          lastInstanceCreatedOn: '2026-04-03',
        },
      ],
    };

    const seedApps = (queryClient = createQueryClientMock()) => {
      queryClient.setQueryData([QueryKey.PublishedApps, org], {
        production: [
          { app, env, org, version: '1' },
          { app: 'idle-app', env, org, version: '2' },
        ],
      });
      queryClient.setQueryData([QueryKey.ErrorMetrics, org, env, range], []);
      return queryClient;
    };

    it('should show the stamp, the summary and the typical time to complete', () => {
      const queryClient = seedApps();
      queryClient.setQueryData([QueryKey.AppDailyMetrics, org, env, period], dailyMetrics);

      renderAppsTable(queryClient);

      expect(
        screen.getByText(/mockedText\(admin\.apps\.stamp, \{"date":"10\. november 2026"/),
      ).toBeInTheDocument();
      expect(
        screen.getByText(textMock('admin.apps.summary.created', { days: period })),
      ).toBeInTheDocument();
      // The total in the summary tile and the app's own row
      expect(screen.getAllByText('120')).toHaveLength(2);
      expect(
        screen.getByText(
          textMock('admin.apps.summary.created_change', { change: '▲ 20', days: period }),
        ),
      ).toBeInTheDocument();
      expect(
        screen.getByText(textMock('admin.apps.summary.completed_share', { percent: 75 })),
      ).toBeInTheDocument();
      expect(
        screen.getByText(
          textMock('admin.apps.typical_time', {
            duration: textMock('admin.workflows.duration.minutes', { count: 11 }),
          }),
        ),
      ).toBeInTheDocument();
    });

    it('should flag an app without use and count it among the deviations', () => {
      const queryClient = seedApps();
      queryClient.setQueryData([QueryKey.AppDailyMetrics, org, env, period], dailyMetrics);

      renderAppsTable(queryClient);

      expect(
        screen.getByText(textMock('admin.apps.deviations.no_use', { months: 7 })),
      ).toBeInTheDocument();
      expect(
        screen.getByText(textMock('admin.apps.summary.deviations_detail', { errors: 0, noUse: 1 })),
      ).toBeInTheDocument();
    });

    it('should put the app without use first by default', () => {
      const queryClient = seedApps();
      queryClient.setQueryData([QueryKey.AppDailyMetrics, org, env, period], dailyMetrics);

      renderAppsTable(queryClient);

      const links = screen.getAllByRole('link');
      expect(links[0]).toHaveTextContent('idle-app');
      expect(links[1]).toHaveTextContent(app);
    });

    it('should show that no daily numbers exist yet', () => {
      const queryClient = seedApps();
      queryClient.setQueryData([QueryKey.AppDailyMetrics, org, env, period], {
        ...dailyMetrics,
        metricDate: null,
        observedSince: null,
        computedAt: null,
        apps: [],
      });

      renderAppsTable(queryClient);

      expect(screen.getByText(textMock('admin.apps.stamp.no_data'))).toBeInTheDocument();
      expect(screen.getAllByText(textMock('admin.apps.deviations.none'))).toHaveLength(2);
    });

    it('should render an error when the daily numbers cannot be fetched', async () => {
      const axiosError = createApiErrorMock(ServerCodes.InternalServerError);
      (axios.get as Mock).mockRejectedValue(axiosError);
      const queryClient = seedApps();

      renderAppsTable(queryClient);

      await waitFor(() => {
        expect(screen.getByText(textMock('admin.apps.metrics.error'))).toBeInTheDocument();
      });
    });
  });
});

const renderAppsTable = (
  client = createQueryClientMock(),
  props: AppsTableProps = defaultProps,
  currentOrg = orgMock,
) => {
  render(
    <MemoryRouter>
      <OrgContext.Provider value={currentOrg}>
        <QueryClientProvider client={client}>
          <AppsTable {...props} />
        </QueryClientProvider>
      </OrgContext.Provider>
    </MemoryRouter>,
  );
};
