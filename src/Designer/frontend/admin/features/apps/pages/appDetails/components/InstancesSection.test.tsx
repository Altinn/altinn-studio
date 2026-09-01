import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import type { QueryClient } from '@tanstack/react-query';
import axios from 'axios';
import type { AxiosResponse } from 'axios';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import { textMock } from '@studio/testing/mocks/i18nMock';
import { app, org } from '@studio/testing/testids';
import { OrgContext } from 'admin/contexts/OrgContext';
import { InstancesSection } from './InstancesSection';

jest.mock('axios', () => ({
  ...jest.requireActual('axios'),
  get: jest.fn(),
}));

const environment = 'at23';
const orgMock = { username: org, full_name: 'Test Org', avatar_url: '', id: 1 };
const instanceGuid = '3a0e0f6e-4b1d-4a2a-9d31-6f8e2b7c1d55';
const failingGuid = '8b1d4f2c-9e77-4a55-b0aa-1c2d3e4f5061';

const collectionsUrl = (url: string) => url.includes('/collections');
const discoveryUrl = (url: string) => collectionsUrl(url) && url.includes('failures=');

const mockRequests = () => {
  jest.mocked(axios.get).mockImplementation(async (url: string) => {
    if (discoveryUrl(url)) {
      return {
        status: 200,
        data: {
          data: [
            {
              key: failingGuid,
              namespace: `${org}/${app}`,
              createdAt: '2026-08-01T10:00:00Z',
              workflowCounts: { active: 0, failedVisible: 1, failedInvisible: 0, total: 1 },
            },
          ],
          pageSize: 25,
          totalCount: 1,
        },
      } as AxiosResponse;
    }
    if (collectionsUrl(url)) {
      return { status: 204, data: '' } as AxiosResponse;
    }
    if (url.includes('/process-metadata')) {
      return { status: 200, data: [] } as AxiosResponse;
    }
    return {
      status: 200,
      data: { instances: [{ id: instanceGuid, org, app, isRead: true }] },
    } as AxiosResponse;
  });
};

const problemsTab = () =>
  screen.getByRole('tab', { name: textMock('admin.workflows.problems.title') });

describe('InstancesSection', () => {
  afterEach(jest.clearAllMocks);

  it('shows the Storage instance list first and asks the engine for nothing but health', async () => {
    mockRequests();
    renderInstancesSection();

    expect(await screen.findByRole('link', { name: instanceGuid })).toBeInTheDocument();
    expect(
      jest
        .mocked(axios.get)
        .mock.calls.map(([url]) => url as string)
        .some(discoveryUrl),
    ).toBe(false);
  });

  it('runs the discovery read only once the problems view is selected', async () => {
    const user = userEvent.setup();
    mockRequests();
    renderInstancesSection();

    await screen.findByRole('link', { name: instanceGuid });
    await user.click(problemsTab());

    expect(await screen.findByRole('link', { name: failingGuid })).toBeInTheDocument();
    await waitFor(() =>
      expect(
        jest
          .mocked(axios.get)
          .mock.calls.map(([url]) => url as string)
          .filter(discoveryUrl),
      ).toHaveLength(1),
    );
  });
});

const renderInstancesSection = (client: QueryClient = createQueryClientMock()) =>
  render(
    <MemoryRouter initialEntries={[`/${org}/apps/${environment}/${app}`]}>
      <OrgContext.Provider value={orgMock}>
        <QueryClientProvider client={client}>
          <Routes>
            <Route
              path=':owner/apps/:environment/:app'
              element={<InstancesSection org={org} environment={environment} app={app} />}
            />
          </Routes>
        </QueryClientProvider>
      </OrgContext.Provider>
    </MemoryRouter>,
  );
