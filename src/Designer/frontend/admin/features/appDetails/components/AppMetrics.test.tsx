import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { AppMetrics, type AppMetricsProps } from './AppMetrics';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import { QueryKey } from 'app-shared/types/QueryKey';
import { QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { textMock } from '@studio/testing/mocks/i18nMock';
import { app, org } from '@studio/testing/testids';
import axios from 'axios';
import { createApiErrorMock } from 'app-shared/mocks/apiErrorMock';
import { ServerCodes } from 'app-shared/enums/ServerCodes';
import userEvent from '@testing-library/user-event';

const env = 'test';
const range = 5;

jest.mock('react-chartjs-2');
jest.mock('react-router-dom', () => {
  const originalModule = jest.requireActual('react-router-dom');
  return {
    ...originalModule,
    useParams: jest.fn(() => ({
      org,
      env,
      app,
    })),
  };
});
jest.mock('axios');
jest.mock('admin/hooks/useQueryParamState');

const defaultProps: AppMetricsProps = {
  range,
  setRange: jest.fn(),
};

describe('AppMetrics', () => {
  afterEach(jest.clearAllMocks);

  describe('app health metrics', () => {
    it('should render loading state', () => {
      renderAppMetrics();

      expect(
        screen.getByLabelText(textMock('admin.metrics.app.health.loading')),
      ).toBeInTheDocument();
    });

    it('should render error state', async () => {
      const axiosError = createApiErrorMock(ServerCodes.InternalServerError);
      (axios.get as jest.Mock).mockRejectedValue(axiosError);

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

      var mockData = [{ name: 'ready_pods', count: 100.0 }];

      queryClient.setQueryData([QueryKey.AppHealthMetrics, org, env, app], mockData);

      renderAppMetrics(queryClient);

      mockData.forEach((metric) => {
        const metricElement = screen.getByText(textMock(`admin.metrics.${metric.name}`));
        expect(metricElement).toBeInTheDocument();
      });
    });
  });

  describe('app error metrics', () => {
    it('should render loading state', () => {
      renderAppMetrics();

      expect(
        screen.getByLabelText(textMock('admin.metrics.app.errors.loading')),
      ).toBeInTheDocument();
    });

    it('should render error state', async () => {
      const axiosError = createApiErrorMock(ServerCodes.InternalServerError);
      (axios.get as jest.Mock).mockRejectedValue(axiosError);

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

      var mockData = [
        {
          name: 'failed_process_next_requests',
          dataPoints: [],
        },
        {
          name: 'failed_instances_requests',
          dataPoints: [],
        },
      ];

      queryClient.setQueryData([QueryKey.AppErrorMetrics, org, env, app, range], mockData);

      renderAppMetrics(queryClient);

      mockData.forEach((metric) => {
        const metricElement = screen.getByText(textMock(`admin.metrics.${metric.name}`));
        expect(metricElement).toBeInTheDocument();
      });
    });
  });

  describe('app metrics', () => {
    it('should render loading state', () => {
      renderAppMetrics();

      expect(screen.getByLabelText(textMock('admin.metrics.app.loading'))).toBeInTheDocument();
    });

    it('should render error state', async () => {
      const axiosError = createApiErrorMock(ServerCodes.InternalServerError);
      (axios.get as jest.Mock).mockRejectedValue(axiosError);

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

      var mockData = [
        {
          name: 'altinn_app_lib_processes_started',
          dataPoints: [],
        },
        {
          name: 'altinn_app_lib_processes_completed',
          dataPoints: [],
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
) => {
  render(
    <MemoryRouter>
      <QueryClientProvider client={client}>
        <AppMetrics {...props} />
      </QueryClientProvider>
    </MemoryRouter>,
  );
};
