import { screen } from '@testing-library/react';
import { Route, Routes } from 'react-router-dom';
import axios from 'axios';
import type { AxiosResponse } from 'axios';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import { QueryKey } from 'app-shared/types/QueryKey';
import { textMock } from '@studio/testing/mocks/i18nMock';
import { renderWithProviders } from '../../../../testing/mocks';
import type { SimpleInstanceDetails } from 'admin/features/apps/types/SimpleInstanceDetails';
import type { RunningApplicationMetadata } from 'admin/features/apps/types/RunningApplicationMetadata';
import { InstanceDetails } from './InstanceDetails';

jest.mock('axios', () => ({
  ...jest.requireActual('axios'),
  get: jest.fn(),
}));

const org = 'ttd';
const environment = 'tt02';
const app = 'test-app';
const instanceId = '51e58b12-6de1-4d0f-9052-ec2ee9d43adf';

const instanceMock: SimpleInstanceDetails = {
  id: instanceId,
  org,
  app,
  isRead: true,
  createdAt: '2026-08-01T12:00:00Z',
  lastChangedAt: '2026-08-02T12:00:00Z',
};

const workflowEngineRequests = () =>
  jest
    .mocked(axios.get)
    .mock.calls.map(([url]) => url as string)
    .filter((url) => url.includes('/workflows/'));

describe('InstanceDetails', () => {
  beforeEach(() => {
    jest.mocked(axios.get).mockResolvedValue({ status: 204, data: '' } as AxiosResponse);
  });
  afterEach(jest.clearAllMocks);

  it('shows an instance of an app on app libraries before v9 without the workflow engine', async () => {
    renderInstanceDetails('8.5.1.0');

    expect(await screen.findByText(textMock('admin.instances.info.title'))).toBeInTheDocument();
    expect(screen.queryByText(textMock('admin.workflows.title'))).not.toBeInTheDocument();
    expect(screen.queryByText(textMock('admin.workflows.health'))).not.toBeInTheDocument();
    expect(workflowEngineRequests()).toHaveLength(0);
  });

  it('shows an instance of an app that cannot tell its app libraries as one before v9', async () => {
    renderInstanceDetails(undefined);

    expect(await screen.findByText(textMock('admin.instances.info.title'))).toBeInTheDocument();
    expect(screen.queryByText(textMock('admin.workflows.title'))).not.toBeInTheDocument();
    expect(workflowEngineRequests()).toHaveLength(0);
  });

  it('shows an instance of an app on v9 with its health and its workflows', async () => {
    renderInstanceDetails('9.0.0.175');

    expect(await screen.findByText(textMock('admin.workflows.title'))).toBeInTheDocument();
    expect(screen.getByText(textMock('admin.workflows.health'))).toBeInTheDocument();
  });
});

function renderInstanceDetails(appLibVersion: string | undefined) {
  const queryClient = createQueryClientMock();
  const appMetadata: RunningApplicationMetadata = {
    id: `${org}/${app}`,
    org,
    altinnNugetVersion: appLibVersion,
  };
  queryClient.setQueryData(
    [QueryKey.AppInstanceDetails, org, environment, app, instanceId],
    instanceMock,
  );
  queryClient.setQueryData([QueryKey.AppMetadata, org, environment, app], appMetadata);
  queryClient.setQueryData([QueryKey.AppProcessMetadata, org, environment, app], []);
  return renderWithProviders(
    <Routes>
      <Route
        path=':owner/apps/:environment/:app/instances/:instanceId'
        element={<InstanceDetails />}
      />
    </Routes>,
    {
      queryClient,
      initialEntries: [`/${org}/apps/${environment}/${app}/instances/${instanceId}`],
    },
  );
}
