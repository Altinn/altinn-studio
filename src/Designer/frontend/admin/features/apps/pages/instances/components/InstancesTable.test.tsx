import { describe, expect, it, vi } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { QueryClient } from '@tanstack/react-query';
import { HttpError } from 'app-shared/utils/networking';
import type { WorkflowCollectionsQuery } from 'admin/features/apps/utils/apiPaths';
import type { CollectionWorkflowCounts } from 'admin/features/apps/types/workflows/WorkflowCollection';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import { textMock } from '@studio/testing/mocks/i18nMock';
import { app, org } from '@studio/testing/testids';
import { OrgContext } from 'admin/contexts/OrgContext';
import { workflowCounts } from 'admin/testing/workflowCounts';
import { renderWithProviders } from 'admin/testing/mocks';
import { InstancesTable } from './InstancesTable';

const environment = 'at23';
const orgMock = { username: org, full_name: 'Test Org', avatar_url: '', id: 1 };

const failedGuid = '3a0e0f6e-4b1d-4a2a-9d31-6f8e2b7c1d55';
const auxiliaryFailedGuid = '8b1d4f2c-9e77-4a55-b0aa-1c2d3e4f5061';
const activeGuid = 'c4d5e6f7-1122-4334-8556-778899aabbcc';
const healthyGuid = 'd5e6f708-2233-4445-9667-88990011ddee';
const unmatchedGuid = 'e6f70819-3344-4556-a778-99001122eeff';
const secondPageGuid = 'f708192a-4455-4667-b889-00112233aabb';

const allGuids = [failedGuid, auxiliaryFailedGuid, activeGuid, healthyGuid, unmatchedGuid];

const instances = (ids: string[]) =>
  ids.map((id) => ({ id, org, app, isRead: true, createdAt: '2026-08-01T10:00:00Z' }));

const instancesResponse = { instances: instances(allGuids) };

const continuationToken = 'next-page';
const firstInstancesPage = { instances: instances(allGuids), continuationToken };
const secondInstancesPage = { instances: instances([secondPageGuid]) };

const collection = (key: string, counts: CollectionWorkflowCounts) => ({
  key,
  namespace: `${org}/${app}`,
  createdAt: '2026-08-01T10:00:00Z',
  workflowCounts: counts,
});

const healthResponse = {
  data: [
    collection(failedGuid, workflowCounts({ total: 2, primary: { failed: 1 } })),
    collection(auxiliaryFailedGuid, workflowCounts({ total: 3, auxiliary: { failed: 2 } })),
    collection(activeGuid, workflowCounts({ primary: { active: 1 } })),
    collection(healthyGuid, workflowCounts({ total: 4 })),
  ],
  pageSize: 5,
  totalCount: 4,
  unmatchedKeys: [unmatchedGuid],
};

const engineUnavailableError = () =>
  new HttpError({
    status: 502,
    data: {
      type: 'urn:altinn:studio:gateway:workflow-engine-unavailable',
      title: 'Workflow engine unavailable',
    },
  });

const getAppInstances = vi.fn();
const getWorkflowCollections = vi.fn();
const getWorkflows = vi.fn();

type InstancesHandler = (continuationToken: string | undefined) => unknown;
type HealthHandler = (keys: string[]) => unknown;

type RouteHandlers = {
  instances?: InstancesHandler;
  health?: HealthHandler;
};

/** Serves the two paged instance pages by continuation token, so both are loadable. */
const pagedInstances: InstancesHandler = (token) =>
  token === continuationToken ? secondInstancesPage : firstInstancesPage;

const mockRequests = ({ instances: instancesHandler, health }: RouteHandlers = {}) => {
  getAppInstances.mockImplementation(
    async (_org: string, _env: string, _app: string, token: string | undefined) =>
      instancesHandler ? instancesHandler(token) : instancesResponse,
  );
  getWorkflowCollections.mockImplementation(
    async (_org: string, _env: string, _app: string, query: WorkflowCollectionsQuery) =>
      health ? health(query.keys ?? []) : healthResponse,
  );
};

const fetchMoreButton = () =>
  screen.getByRole('button', { name: textMock('admin.instances.fetch_more') });

const healthCellOf = async (instanceId: string): Promise<HTMLElement> => {
  await screen.findByRole('link', { name: instanceId });
  const row = screen
    .getAllByRole('row')
    .find((candidate) => within(candidate).queryByRole('link', { name: instanceId }));
  if (!row) {
    throw new Error(`No row found for instance ${instanceId}`);
  }
  const cells = within(row).getAllByRole('cell');
  return cells[cells.length - 1];
};

/** The health column is enrichment, so it settles after the row it decorates is already on screen. */
const expectHealth = (instanceId: string, healthTextKey: string) =>
  waitFor(async () =>
    expect(await healthCellOf(instanceId)).toHaveTextContent(textMock(healthTextKey)),
  );

const workflowEngineRequests = () => [
  ...getWorkflowCollections.mock.calls,
  ...getWorkflows.mock.calls,
];

describe('InstancesTable workflow health column', () => {
  it('leaves the column out, and the engine unasked, for an app that does not run on it', async () => {
    mockRequests();
    renderInstancesTable(createQueryClientMock(), false);

    await screen.findByRole('link', { name: failedGuid });
    expect(screen.queryByText(textMock('admin.workflows.health'))).not.toBeInTheDocument();
    const [, firstRow] = screen.getAllByRole('row');
    expect(within(firstRow).getAllByRole('cell')).toHaveLength(4);
    expect(workflowEngineRequests()).toHaveLength(0);
  });

  it('lists the newest instance first, whatever order Storage handed them over in', async () => {
    mockRequests({
      instances: () => ({
        instances: [
          { id: healthyGuid, org, app, isRead: true, createdAt: '2026-08-01T10:00:00Z' },
          { id: activeGuid, org, app, isRead: true, createdAt: '2026-08-03T10:00:00Z' },
          { id: failedGuid, org, app, isRead: true, createdAt: '2026-08-02T10:00:00Z' },
        ],
      }),
    });
    renderInstancesTable();

    await screen.findByRole('link', { name: healthyGuid });
    expect(screen.getAllByRole('link').map((link) => link.textContent)).toEqual([
      activeGuid,
      failedGuid,
      healthyGuid,
    ]);
  });

  it('renders the traffic light for each derived state', async () => {
    mockRequests();
    renderInstancesTable();

    await expectHealth(failedGuid, 'admin.workflows.health.failed');
    await expectHealth(auxiliaryFailedGuid, 'admin.workflows.health.auxiliary_workflow_failed');
    await expectHealth(activeGuid, 'admin.workflows.health.active');
    await expectHealth(healthyGuid, 'admin.workflows.health.healthy');
  });

  it('renders an unmatched key as no data, distinct from healthy', async () => {
    mockRequests();
    renderInstancesTable();

    // The other rows prove the response was applied, so no data here is the unmatched key, not a
    // request that never landed.
    await expectHealth(healthyGuid, 'admin.workflows.health.healthy');
    const cell = await healthCellOf(unmatchedGuid);
    expect(cell).toHaveTextContent(textMock('admin.workflows.health.no_data'));
    expect(cell).not.toHaveTextContent(textMock('admin.workflows.health.healthy'));
  });

  it('explains every state in the column legend, including what no data can mean', async () => {
    const user = userEvent.setup();
    mockRequests();
    renderInstancesTable();

    await expectHealth(healthyGuid, 'admin.workflows.health.healthy');
    await user.click(
      screen.getByRole('button', { name: textMock('admin.workflows.health.legend') }),
    );

    [
      'admin.workflows.health.failed_description',
      'admin.workflows.health.auxiliary_workflow_failed_description',
      'admin.workflows.health.active_description',
      'admin.workflows.health.healthy_description',
      'admin.workflows.health.no_data_description',
      'admin.workflows.health.unknown_description',
      'admin.workflows.health.unavailable_description',
    ].forEach((key) => expect(screen.getByText(textMock(key))).toBeInTheDocument());
  });

  it('annotates with one request carrying every loaded instance key', async () => {
    mockRequests();
    renderInstancesTable();

    await healthCellOf(healthyGuid);

    const requestedKeys = getWorkflowCollections.mock.calls.map(
      ([, , , query]: [string, string, string, WorkflowCollectionsQuery]) => query.keys ?? [],
    );

    expect(requestedKeys).toHaveLength(1);
    allGuids.forEach((guid) => expect(requestedKeys[0]).toContain(guid));
  });

  it('shows the column as unavailable without disturbing the instance list', async () => {
    mockRequests({ health: () => Promise.reject(engineUnavailableError()) });
    renderInstancesTable();

    await waitFor(async () =>
      expect(await healthCellOf(failedGuid)).toHaveTextContent(
        textMock('admin.workflows.health.unavailable'),
      ),
    );

    // The list itself still comes from Storage and is unaffected.
    expect(screen.getAllByRole('link')).toHaveLength(allGuids.length);
    expect(screen.queryByText(textMock('general.page_error_title'))).not.toBeInTheDocument();
  });

  it('degrades to unknown, not to no data, when the health request fails for another reason', async () => {
    mockRequests({ health: () => Promise.reject(new Error('boom')) });
    renderInstancesTable();

    await waitFor(async () =>
      expect(await healthCellOf(failedGuid)).toHaveTextContent(
        textMock('admin.workflows.health.unknown'),
      ),
    );
    // No data claims the engine holds nothing about the instance, which a failed request cannot say.
    expect(await healthCellOf(failedGuid)).not.toHaveTextContent(
      textMock('admin.workflows.health.no_data'),
    );
    expect(screen.getAllByRole('link')).toHaveLength(allGuids.length);
  });

  it('places the loading placeholder only on the rows whose own page is still loading', async () => {
    const user = userEvent.setup();
    mockRequests({
      instances: pagedInstances,
      // The first page's annotate request answers; the second page's never does.
      health: (keys) => (keys.includes(healthyGuid) ? healthResponse : new Promise(() => {})),
    });
    renderInstancesTable();

    await expectHealth(healthyGuid, 'admin.workflows.health.healthy');
    await user.click(fetchMoreButton());
    await screen.findByRole('link', { name: secondPageGuid });

    const answeredCell = await healthCellOf(healthyGuid);
    expect(answeredCell).toHaveTextContent(textMock('admin.workflows.health.healthy'));
    expect(
      within(answeredCell).queryByLabelText(textMock('general.loading')),
    ).not.toBeInTheDocument();

    const loadingCell = await healthCellOf(secondPageGuid);
    expect(within(loadingCell).getByLabelText(textMock('general.loading'))).toBeInTheDocument();
    expect(loadingCell).not.toHaveTextContent(textMock('admin.workflows.health.no_data'));
    expect(loadingCell).not.toHaveTextContent(textMock('admin.workflows.health.unknown'));
  });

  it('keeps the verdicts of the pages that answered when one page cannot reach the engine', async () => {
    const user = userEvent.setup();
    mockRequests({
      instances: pagedInstances,
      health: (keys) =>
        keys.includes(healthyGuid) ? healthResponse : Promise.reject(engineUnavailableError()),
    });
    renderInstancesTable();

    await expectHealth(healthyGuid, 'admin.workflows.health.healthy');
    await user.click(fetchMoreButton());

    await expectHealth(secondPageGuid, 'admin.workflows.health.unavailable');
    // One page's transient failure must not grey out the rows that already have a verdict.
    await expectHealth(healthyGuid, 'admin.workflows.health.healthy');
    await expectHealth(failedGuid, 'admin.workflows.health.failed');
  });

  it('reports no data for an empty annotate answer', async () => {
    mockRequests({ health: () => Promise.resolve(null) });
    renderInstancesTable();

    await waitFor(async () =>
      expect(await healthCellOf(healthyGuid)).toHaveTextContent(
        textMock('admin.workflows.health.no_data'),
      ),
    );
  });
});

const renderInstancesTable = (
  queryClient: QueryClient = createQueryClientMock(),
  showWorkflowHealth: boolean = true,
) =>
  renderWithProviders(
    <OrgContext.Provider value={orgMock}>
      <InstancesTable
        org={org}
        environment={environment}
        app={app}
        showWorkflowHealth={showWorkflowHealth}
      />
    </OrgContext.Provider>,
    { queryClient, queries: { getAppInstances, getWorkflowCollections, getWorkflows } },
  );
