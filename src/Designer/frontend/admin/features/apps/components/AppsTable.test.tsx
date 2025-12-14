import React from 'react';
import { render, screen } from '@testing-library/react';
import { AppsTable, type AppsTableProps } from './AppsTable';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import { QueryKey } from 'app-shared/types/QueryKey';
import { QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { textMock } from '@studio/testing/mocks/i18nMock';

const defaultProps: AppsTableProps = {
  org: 'ttd',
};

describe('AppsTable', () => {
  describe('Alerts', () => {
    it('should render alerts', () => {
      const queryClient = createQueryClientMock();
      const url = 'http://localhost:3003/alerting/grafana/af1pzestjhs74e/view';

      queryClient.setQueryData([QueryKey.PublishedApps, defaultProps.org], {
        production: [
          {
            app: 'app1',
            env: 'tt02',
            org: defaultProps.org,
            version: '1',
          },
        ],
      });
      queryClient.setQueryData(
        [QueryKey.Alerts, defaultProps.org, 'production'],
        [
          {
            alertId: '10f6c6a8c6f68886',
            alertRuleId: 'af1pzestjhs74e',
            type: '5xx-failed-requests',
            app: 'app1',
            url,
          },
        ],
      );
      renderAppsTable(queryClient);

      const error = screen.getByText(textMock('admin.alerts.5xx-failed-requests'));
      expect(error).toBeInTheDocument();

      const link = screen.getByRole('link', { name: textMock('admin.alerts.link') });
      expect(link).toBeInTheDocument();
      expect(link).toHaveAttribute('href', url);
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
