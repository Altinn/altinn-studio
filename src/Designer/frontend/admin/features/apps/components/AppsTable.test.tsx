import React from 'react';
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
import userEvent from '@testing-library/user-event';
import { useQueryParamState } from 'admin/hooks/useQueryParamState';

const range = 1440;
const env = 'production';

const defaultProps: AppsTableProps = {
  org,
};

jest.mock('axios', () => ({
  ...jest.requireActual('axios'),
  get: jest.fn(),
}));
jest.mock('admin/hooks/useQueryParamState');

const mockSetRange = jest.fn();

describe('AppsTable', () => {
  beforeEach(() => {
    jest.mocked(useQueryParamState).mockImplementation((key, defaultValue) => {
      if (key === 'range') {
        return [1440, mockSetRange];
      }
      return [defaultValue, jest.fn()];
    });
  });
  afterEach(jest.clearAllMocks);

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
      (axios.get as jest.Mock).mockRejectedValue(axiosError);

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

    it('should render warning alert for 403 forbidden errors', async () => {
      const axiosError = createApiErrorMock(ServerCodes.Forbidden);
      (axios.get as jest.Mock).mockRejectedValue(axiosError);

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
          textMock('admin.metrics.errors.forbidden', { env: textMock(`admin.environment.${env}`) }),
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
) => {
  render(
    <MemoryRouter>
      <QueryClientProvider client={client}>
        <AppsTable {...props} />
      </QueryClientProvider>
    </MemoryRouter>,
  );
};
