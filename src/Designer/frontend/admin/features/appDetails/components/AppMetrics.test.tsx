import React from 'react';
import { render, screen } from '@testing-library/react';
import { AppMetrics, type AppMetricsProps } from './AppMetrics';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import { QueryKey } from 'app-shared/types/QueryKey';
import { QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { textMock } from '@studio/testing/mocks/i18nMock';
import { app, org } from '@studio/testing/testids';

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

const defaultProps: AppMetricsProps = {
  range,
  setRange: () => {},
};

describe('AppMetrics', () => {
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
