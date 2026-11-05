import { describe, expect, it, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes } from 'react-router-dom';
import type { QueryClient } from '@tanstack/react-query';
import type { WorkflowCollectionsQuery } from 'admin/features/apps/utils/apiPaths';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import { textMock } from '@studio/testing/mocks/i18nMock';
import { app, org } from '@studio/testing/testids';
import { OrgContext } from 'admin/contexts/OrgContext';
import { workflowCounts } from 'admin/testing/workflowCounts';
import { renderWithProviders } from 'admin/testing/mocks';
import { InstancesSection } from './InstancesSection';

const environment = 'at23';
const orgMock = { username: org, full_name: 'Test Org', avatar_url: '', id: 1 };
const instanceGuid = '3a0e0f6e-4b1d-4a2a-9d31-6f8e2b7c1d55';
const failingGuid = '8b1d4f2c-9e77-4a55-b0aa-1c2d3e4f5061';

const getRunningAppMetadata = vi.fn();
const getWorkflowCollections = vi.fn();
const getWorkflows = vi.fn();
const getProcessMetadata = vi.fn();
const getAppInstances = vi.fn();

const isDiscovery = (query: WorkflowCollectionsQuery) => query.failures !== undefined;

/** The app libraries' version the running app reports; `null` for an app that does not answer. */
type MockOptions = { appLibVersion?: string | null };

const mockRequests = ({ appLibVersion = '9.0.0.175' }: MockOptions = {}) => {
  getRunningAppMetadata.mockImplementation(async () => {
    if (appLibVersion === null) {
      throw new Error('The app did not answer');
    }
    return { id: `${org}/${app}`, org, altinnNugetVersion: appLibVersion };
  });
  getWorkflowCollections.mockImplementation(
    async (_org: string, _env: string, _app: string, query: WorkflowCollectionsQuery) =>
      isDiscovery(query)
        ? {
            data: [
              {
                key: failingGuid,
                namespace: `${org}/${app}`,
                createdAt: '2026-08-01T10:00:00Z',
                workflowCounts: workflowCounts({ primary: { failed: 1 } }),
              },
            ],
            pageSize: 25,
            totalCount: 1,
          }
        : null,
  );
  getWorkflows.mockResolvedValue(null);
  getProcessMetadata.mockResolvedValue([]);
  getAppInstances.mockResolvedValue({ instances: [{ id: instanceGuid, org, app, isRead: true }] });
};

const problemsTab = () =>
  screen.getByRole('tab', { name: textMock('admin.workflows.problems.title') });

const workflowEngineRequests = () => [
  ...getWorkflowCollections.mock.calls,
  ...getWorkflows.mock.calls,
];

const discoveryRequests = () =>
  getWorkflowCollections.mock.calls.filter(
    ([, , , query]: [string, string, string, WorkflowCollectionsQuery]) => isDiscovery(query),
  );

describe('InstancesSection', () => {
  it('shows an app on app libraries before v9 its instances alone, and asks the engine nothing', async () => {
    mockRequests({ appLibVersion: '8.5.1.0' });
    renderInstancesSection();

    expect(await screen.findByRole('link', { name: instanceGuid })).toBeInTheDocument();
    expect(screen.queryByRole('tab')).not.toBeInTheDocument();
    expect(screen.queryByText(textMock('admin.workflows.health'))).not.toBeInTheDocument();
    expect(workflowEngineRequests()).toHaveLength(0);
  });

  it('shows an app that cannot tell its app libraries as one before v9', async () => {
    mockRequests({ appLibVersion: null });
    renderInstancesSection();

    expect(await screen.findByRole('link', { name: instanceGuid })).toBeInTheDocument();
    expect(screen.queryByRole('tab')).not.toBeInTheDocument();
    expect(workflowEngineRequests()).toHaveLength(0);
  });

  it('shows the Storage instance list first and asks the engine for nothing but health', async () => {
    mockRequests();
    renderInstancesSection();

    expect(await screen.findByRole('link', { name: instanceGuid })).toBeInTheDocument();
    expect(problemsTab()).toBeInTheDocument();
    expect(discoveryRequests()).toHaveLength(0);
  });

  it('runs the discovery read only once the problems view is selected', async () => {
    const user = userEvent.setup();
    mockRequests();
    renderInstancesSection();

    await screen.findByRole('link', { name: instanceGuid });
    await user.click(problemsTab());

    expect(await screen.findByRole('link', { name: failingGuid })).toBeInTheDocument();
    await waitFor(() => expect(discoveryRequests()).toHaveLength(1));
  });
});

const renderInstancesSection = (queryClient: QueryClient = createQueryClientMock()) =>
  renderWithProviders(
    <OrgContext.Provider value={orgMock}>
      <Routes>
        <Route
          path=':owner/apps/:environment/:app'
          element={<InstancesSection org={org} environment={environment} app={app} />}
        />
      </Routes>
    </OrgContext.Provider>,
    {
      queryClient,
      initialEntries: [`/${org}/apps/${environment}/${app}`],
      queries: {
        getRunningAppMetadata,
        getWorkflowCollections,
        getWorkflows,
        getProcessMetadata,
        getAppInstances,
      },
    },
  );
