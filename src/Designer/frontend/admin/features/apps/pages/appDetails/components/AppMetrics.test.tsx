import { describe, expect, it, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { AppMetrics, type AppMetricsProps } from './AppMetrics';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import { QueryKey } from 'app-shared/types/QueryKey';
import { textMock } from '@studio/testing/mocks/i18nMock';
import { app, org } from '@studio/testing/testids';
import { createApiErrorMock } from 'app-shared/mocks/apiErrorMock';
import { ServerCodes } from 'app-shared/enums/ServerCodes';
import userEvent from '@testing-library/user-event';
import { OrgContext } from 'admin/contexts/OrgContext';
import { renderWithProviders } from 'admin/testing/mocks';

const env = 'test';
const envTitle = `${textMock('general.test_environment_alt').toLowerCase()} ${env.toUpperCase()}`;
const orgFullName = 'Test Org Full Name';
const range = 5;

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

vi.mock('react-chartjs-2');
vi.mock('admin/hooks/useRequiredRoutePathsParams', () => ({
  useRequiredRoutePathsParams: () => ({ owner: org, environment: env, app }),
}));
vi.mock('admin/features/apps/hooks/useQueryParamState');

const defaultProps: AppMetricsProps = {
  range,
  setRange: vi.fn(),
};

const getAppHealthMetrics = vi.fn();
const getAppErrorMetrics = vi.fn();
const getAppMetrics = vi.fn();
const metricsQueries = { getAppHealthMetrics, getAppErrorMetrics, getAppMetrics };

/** Answers every metrics request the same way, whichever endpoint it goes to. */
const mockRequests = (respond: () => Promise<unknown>) =>
  Object.values(metricsQueries).forEach((query) => query.mockImplementation(respond));

describe('AppMetrics', () => {
  describe('app health metrics', () => {
    it('should render loading state', () => {
      mockRequests(() => new Promise(() => {}));
      renderAppMetrics();

      expect(
        screen.getByLabelText(textMock('admin.metrics.app.health.loading')),
      ).toBeInTheDocument();
    });

    it('should render info alert when missing rights', async () => {
      const apiError = createApiErrorMock(ServerCodes.Forbidden);
      mockRequests(() => Promise.reject(apiError));

      renderAppMetrics();

      await waitFor(() => {
        expect(
          screen.queryByLabelText(textMock('admin.metrics.app.health.loading')),
        ).not.toBeInTheDocument();
      });

      expect(
        screen.getByText(
          textMock('admin.metrics.app.health.missing_rights', { envTitle, orgName: orgFullName }),
        ),
      ).toBeInTheDocument();
    });

    it.each([
      ['health', 'admin.metrics.app.health.missing_rights', 'admin.metrics.app.health.loading'],
      ['errors', 'admin.metrics.app.errors.missing_rights', 'admin.metrics.app.errors.loading'],
      ['app', 'admin.metrics.app.missing_rights', 'admin.metrics.app.loading'],
    ])(
      'should use org username when full name is missing in %s missing rights alert',
      async (_section, missingRightsKey, loadingKey) => {
        const apiError = createApiErrorMock(ServerCodes.Forbidden);
        mockRequests(() => Promise.reject(apiError));

        renderAppMetrics(createQueryClientMock(), defaultProps, orgMockWithoutFullName);

        await waitFor(() => {
          expect(screen.queryByLabelText(textMock(loadingKey))).not.toBeInTheDocument();
        });

        expect(
          screen.getByText(textMock(missingRightsKey, { envTitle, orgName: org })),
        ).toBeInTheDocument();
      },
    );

    it('should render error state', async () => {
      const apiError = createApiErrorMock(ServerCodes.InternalServerError);
      mockRequests(() => Promise.reject(apiError));

      renderAppMetrics();

      await waitFor(() => {
        expect(
          screen.queryByLabelText(textMock('admin.metrics.app.loading')),
        ).not.toBeInTheDocument();
      });

      expect(screen.getByText(textMock('admin.metrics.app.health.error'))).toBeInTheDocument();
    });

    it('should render app health metrics', () => {
      const queryClient = createQueryClientMock();

      const mockData = [{ name: 'ready_pods', count: 100.0 }];

      queryClient.setQueryData([QueryKey.AppHealthMetrics, org, env, app], mockData);

      renderAppMetrics(queryClient);

      mockData.forEach((metric) => {
        const metricElement = screen.getByText(textMock(`admin.metrics.${metric.name}`));
        expect(metricElement).toBeInTheDocument();
      });
    });

    it('should render a success alert when 100% of the pods are ready', () => {
      const queryClient = createQueryClientMock();

      var mockData = [{ name: 'ready_pods', count: 100.0 }];

      queryClient.setQueryData([QueryKey.AppHealthMetrics, org, env, app], mockData);

      renderAppMetrics(queryClient);

      expect(screen.getByRole('alert')).toHaveAttribute('data-color', 'success');
    });

    it('should render a warning alert when 1%-99% of the pods are ready', () => {
      const queryClient = createQueryClientMock();

      var mockData = [{ name: 'ready_pods', count: 50.0 }];

      queryClient.setQueryData([QueryKey.AppHealthMetrics, org, env, app], mockData);

      renderAppMetrics(queryClient);

      expect(screen.getByRole('alert')).toHaveAttribute('data-color', 'warning');
    });

    it('should render a danger alert when 0% of the pods are ready', () => {
      const queryClient = createQueryClientMock();

      var mockData = [{ name: 'ready_pods', count: 0.0 }];

      queryClient.setQueryData([QueryKey.AppHealthMetrics, org, env, app], mockData);

      renderAppMetrics(queryClient);

      expect(screen.getByRole('alert')).toHaveAttribute('data-color', 'danger');
    });
  });

  describe('app error metrics', () => {
    it('should render loading state', () => {
      mockRequests(() => new Promise(() => {}));
      renderAppMetrics();

      expect(
        screen.getByLabelText(textMock('admin.metrics.app.errors.loading')),
      ).toBeInTheDocument();
    });

    it('should render info alert when missing rights', async () => {
      const apiError = createApiErrorMock(ServerCodes.Forbidden);
      mockRequests(() => Promise.reject(apiError));

      renderAppMetrics();

      await waitFor(() => {
        expect(
          screen.queryByLabelText(textMock('admin.metrics.app.errors.loading')),
        ).not.toBeInTheDocument();
      });

      expect(
        screen.getByText(
          textMock('admin.metrics.app.errors.missing_rights', { envTitle, orgName: orgFullName }),
        ),
      ).toBeInTheDocument();
    });

    it('should render error state', async () => {
      const apiError = createApiErrorMock(ServerCodes.InternalServerError);
      mockRequests(() => Promise.reject(apiError));

      renderAppMetrics();

      await waitFor(() => {
        expect(
          screen.queryByLabelText(textMock('admin.metrics.app.loading')),
        ).not.toBeInTheDocument();
      });

      expect(screen.getByText(textMock('admin.metrics.app.errors.error'))).toBeInTheDocument();
    });

    it('should render app error metrics', () => {
      const queryClient = createQueryClientMock();

      const mockData = [
        {
          name: 'failed_process_next_requests',
          timestamps: [],
          counts: [],
          bucketSize: 5,
        },
        {
          name: 'failed_instance_creation_requests',
          timestamps: [],
          counts: [],
          bucketSize: 5,
        },
      ];

      queryClient.setQueryData([QueryKey.AppErrorMetrics, org, env, app, range], mockData);

      renderAppMetrics(queryClient);

      mockData.forEach((metric) => {
        const metricElement = screen.getByText(textMock(`admin.metrics.${metric.name}`));
        expect(metricElement).toBeInTheDocument();
      });
    });

    it('should render a success alert when no errors', () => {
      const queryClient = createQueryClientMock();

      const mockData = [
        {
          name: 'failed_instance_creation_requests',
          timestamps: [],
          counts: [],
          bucketSize: 5,
        },
      ];

      queryClient.setQueryData([QueryKey.AppErrorMetrics, org, env, app, range], mockData);

      renderAppMetrics(queryClient);

      mockData.forEach((metric) => {
        const metricElement = screen.getByText(textMock(`admin.metrics.${metric.name}`));
        expect(metricElement).toBeInTheDocument();
      });

      expect(screen.getByRole('alert')).toHaveAttribute('data-color', 'success');
    });

    it('should render a danger alert when errors', () => {
      const queryClient = createQueryClientMock();

      const timestampTest = Date.UTC(2024, 0, 1);
      const mockData = [
        {
          name: 'failed_process_next_requests',
          timestamps: [timestampTest],
          counts: [5],
          bucketSize: 5,
        },
      ];

      queryClient.setQueryData([QueryKey.AppErrorMetrics, org, env, app, range], mockData);

      renderAppMetrics(queryClient);

      mockData.forEach((metric) => {
        const metricElement = screen.getByText(textMock(`admin.metrics.${metric.name}`));
        expect(metricElement).toBeInTheDocument();
      });

      expect(screen.getByRole('alert')).toHaveAttribute('data-color', 'danger');
    });
  });

  describe('app metrics', () => {
    it('should render loading state', () => {
      mockRequests(() => new Promise(() => {}));
      renderAppMetrics();

      expect(screen.getByLabelText(textMock('admin.metrics.app.loading'))).toBeInTheDocument();
    });

    it('should render info alert when missing rights', async () => {
      const apiError = createApiErrorMock(ServerCodes.Forbidden);
      mockRequests(() => Promise.reject(apiError));

      renderAppMetrics();

      await waitFor(() => {
        expect(
          screen.queryByLabelText(textMock('admin.metrics.app.loading')),
        ).not.toBeInTheDocument();
      });

      expect(
        screen.getByText(
          textMock('admin.metrics.app.missing_rights', { envTitle, orgName: orgFullName }),
        ),
      ).toBeInTheDocument();
    });

    it('should render error state', async () => {
      const apiError = createApiErrorMock(ServerCodes.InternalServerError);
      mockRequests(() => Promise.reject(apiError));

      renderAppMetrics();

      await waitFor(() => {
        expect(
          screen.queryByLabelText(textMock('admin.metrics.app.loading')),
        ).not.toBeInTheDocument();
      });

      expect(screen.getByText(textMock('admin.metrics.app.error'))).toBeInTheDocument();
    });

    it('should render app metrics', () => {
      const queryClient = createQueryClientMock();

      const mockData = [
        {
          name: 'altinn_app_lib_processes_started',
          timestamps: [],
          counts: [],
          bucketSize: 5,
        },
        {
          name: 'altinn_app_lib_processes_ended',
          timestamps: [],
          counts: [],
          bucketSize: 5,
        },
      ];

      queryClient.setQueryData([QueryKey.AppMetrics, org, env, app, range], mockData);

      renderAppMetrics(queryClient);

      mockData.forEach((metric) => {
        const metricElement = screen.getByText(textMock(`admin.metrics.${metric.name}`));
        expect(metricElement).toBeInTheDocument();
      });
    });
  });

  it('should change range when selecting a new range', async () => {
    const user = userEvent.setup();

    const queryClient = createQueryClientMock();

    renderAppMetrics(queryClient);

    const select = screen.getByRole('combobox');
    await user.selectOptions(select, '60');

    expect(defaultProps.setRange).toHaveBeenCalledWith(60);
  });
});

const renderAppMetrics = (
  client = createQueryClientMock(),
  props: AppMetricsProps = defaultProps,
  currentOrg = orgMock,
) => {
  renderWithProviders(
    <OrgContext.Provider value={currentOrg}>
      <AppMetrics {...props} />
    </OrgContext.Provider>,
    { queryClient: client, queries: metricsQueries },
  );
};
