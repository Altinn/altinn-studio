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
import { toast } from 'react-toastify';

const range = 1440;
const env = 'production';

const defaultProps: AppsTableProps = {
  org,
};

jest.mock('react-toastify');

jest.mock('axios');

describe('AppsTable', () => {
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

    it('should render error state', async () => {
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

      expect(toast.error).toHaveBeenCalledWith(textMock('admin.metrics.errors.error'));
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
          name: 'failed_instances_requests',
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
