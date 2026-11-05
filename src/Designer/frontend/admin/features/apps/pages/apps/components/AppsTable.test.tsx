import { beforeEach, describe, expect, it, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { AppsTable, type AppsTableProps } from './AppsTable';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import { QueryKey } from 'app-shared/types/QueryKey';
import { textMock } from '@studio/testing/mocks/i18nMock';
import { app, org } from '@studio/testing/testids';
import { createApiErrorMock } from 'app-shared/mocks/apiErrorMock';
import { ServerCodes } from 'app-shared/enums/ServerCodes';
import userEvent from '@testing-library/user-event';
import { useQueryParamState } from 'admin/features/apps/hooks/useQueryParamState';
import { OrgContext } from 'admin/contexts/OrgContext';
import { renderWithProviders } from 'admin/testing/mocks';

const range = 1440;
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

vi.mock('admin/features/apps/hooks/useQueryParamState');

const mockSetRange = vi.fn();
const mockSetEnvironment = vi.fn();

const getRunningApps = vi.fn();
const getErrorMetrics = vi.fn();
const metricsQueries = { getRunningApps, getErrorMetrics };

/** Answers every metrics request the same way, whichever endpoint it goes to. */
const mockRequests = (respond: () => Promise<unknown>) =>
  Object.values(metricsQueries).forEach((query) => query.mockImplementation(respond));

describe('AppsTable', () => {
  beforeEach(() => {
    vi.mocked(useQueryParamState).mockImplementation((key, defaultValue) => {
      if (key === 'range') {
        return [1440, mockSetRange];
      }
      if (key === 'environment') {
        return [defaultValue, mockSetEnvironment];
      }
      return [defaultValue, vi.fn()];
    });
  });

  describe('Metrics', () => {
    it('should render loading state', () => {
      mockRequests(() => new Promise(() => {}));
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

      expect(screen.getByLabelText(textMock('admin.metrics.errors.loading'))).toBeInTheDocument();
    });

    it('should render error state with danger alert for non-403 errors', async () => {
      const apiError = createApiErrorMock(ServerCodes.InternalServerError);
      mockRequests(() => Promise.reject(apiError));

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
          screen.queryByLabelText(textMock('admin.metrics.errors.loading')),
        ).not.toBeInTheDocument();
      });

      expect(screen.getByText(textMock('admin.metrics.errors.error'))).toBeInTheDocument();
    });

    it('should render info alert when missing rights', async () => {
      const apiError = createApiErrorMock(ServerCodes.Forbidden);
      mockRequests(() => Promise.reject(apiError));

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
          screen.queryByLabelText(textMock('admin.metrics.errors.loading')),
        ).not.toBeInTheDocument();
      });

      expect(
        screen.getByText(
          textMock('admin.metrics.errors.missing_rights', { envTitle, orgName: orgFullName }),
        ),
      ).toBeInTheDocument();
    });

    it('should use org username when full name is missing in missing rights alert', async () => {
      const apiError = createApiErrorMock(ServerCodes.Forbidden);
      mockRequests(() => Promise.reject(apiError));

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
          screen.queryByLabelText(textMock('admin.metrics.errors.loading')),
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
        if (key === 'range') return [1440, mockSetRange];
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

  it('should change range when selecting a new range', async () => {
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

    const select = screen.getByRole('combobox');
    await user.selectOptions(select, '60');

    expect(mockSetRange).toHaveBeenCalledWith(60);
  });
});

const renderAppsTable = (
  client = createQueryClientMock(),
  props: AppsTableProps = defaultProps,
  currentOrg = orgMock,
) => {
  renderWithProviders(
    <OrgContext.Provider value={currentOrg}>
      <AppsTable {...props} />
    </OrgContext.Provider>,
    { queryClient: client, queries: metricsQueries },
  );
};
