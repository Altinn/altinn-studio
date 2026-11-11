import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Mock } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
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

vi.mock('axios', async () => {
  const actual = await vi.importActual<{ default: AxiosStatic }>('axios');
  return { ...actual, default: { ...actual.default, get: vi.fn() } };
});
vi.mock('admin/features/apps/hooks/useQueryParamState');

const mockSetRange = vi.fn();
const mockSetEnvironment = vi.fn();

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
          screen.queryByLabelText(textMock('admin.metrics.errors.loading')),
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

  describe('Status and versions', () => {
    const otherApp = 'other-app';

    const setUpApps = (queryClient = createQueryClientMock()) => {
      queryClient.setQueryData([QueryKey.PublishedApps, org], {
        production: [
          { app, env, org, version: '1' },
          { app: otherApp, env, org, version: '2' },
        ],
      });
      return queryClient;
    };

    it("shows each app's backend version and status", () => {
      const queryClient = setUpApps();
      queryClient.setQueryData(
        [QueryKey.PublishedAppStatuses, org, env],
        [
          { app, status: 'ready', appLibVersion: '8.7.2' },
          { app: otherApp, status: null, appLibVersion: null },
        ],
      );

      renderAppsTable(queryClient);

      const appRow = screen.getByRole('row', { name: new RegExp(`^${app}\\b`) });
      expect(within(appRow).getByText('8.7.2')).toBeInTheDocument();
      expect(within(appRow).getByText(textMock('admin.apps.status.ready'))).toBeInTheDocument();
      const otherRow = screen.getByRole('row', { name: new RegExp(`^${otherApp}\\b`) });
      expect(within(otherRow).getByText(textMock('admin.apps.status.unknown'))).toBeInTheDocument();
    });

    it('lists an app that needs attention first', () => {
      const queryClient = setUpApps();
      queryClient.setQueryData(
        [QueryKey.PublishedAppStatuses, org, env],
        [
          { app, status: 'ready', appLibVersion: '8.7.2' },
          { app: otherApp, status: 'unavailable', appLibVersion: null },
        ],
      );

      renderAppsTable(queryClient);

      const [, firstRow, secondRow] = screen.getAllByRole('row');
      expect(within(firstRow).getByRole('link', { name: otherApp })).toBeInTheDocument();
      expect(
        within(firstRow).getByText(textMock('admin.apps.status.unavailable')),
      ).toBeInTheDocument();
      expect(within(secondRow).getByRole('link', { name: app })).toBeInTheDocument();
    });

    it('says an app has no errors only when the errors could be read', async () => {
      const queryClient = setUpApps();
      queryClient.setQueryData([QueryKey.ErrorMetrics, org, env, range], []);

      renderAppsTable(queryClient);

      expect(screen.getAllByText(textMock('admin.apps.no_errors'))).toHaveLength(2);
    });

    it('shows dashes rather than an all-clear when the errors and statuses cannot be read', async () => {
      (axios.get as Mock).mockRejectedValue(createApiErrorMock(ServerCodes.InternalServerError));
      const queryClient = setUpApps();

      renderAppsTable(queryClient);

      await waitFor(() => {
        expect(
          screen.queryByLabelText(textMock('admin.metrics.errors.loading')),
        ).not.toBeInTheDocument();
      });
      await waitFor(() => {
        expect(screen.queryAllByLabelText(textMock('admin.apps.status.loading'))).toHaveLength(0);
      });
      expect(screen.queryByText(textMock('admin.apps.no_errors'))).not.toBeInTheDocument();
      const appRow = screen.getByRole('row', { name: new RegExp(`^${app}\\b`) });
      // The backend version, the status and the errors.
      expect(within(appRow).getAllByText('-')).toHaveLength(3);
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
