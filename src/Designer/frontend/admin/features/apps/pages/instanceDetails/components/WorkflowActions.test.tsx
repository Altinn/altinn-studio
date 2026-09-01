import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClientProvider } from '@tanstack/react-query';
import type { QueryClient } from '@tanstack/react-query';
import axios from 'axios';
import type { AxiosResponse } from 'axios';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import { QueryKey } from 'app-shared/types/QueryKey';
import { textMock } from '@studio/testing/mocks/i18nMock';
import { app, org } from '@studio/testing/testids';
import type { WorkflowOpsContext } from 'admin/features/apps/hooks/mutations/useWorkflowOpsMutations';
import type {
  PersistentItemStatus,
  WorkflowStatus,
} from 'admin/features/apps/types/workflows/WorkflowStatus';
import { WorkflowActions } from './WorkflowActions';

jest.mock('axios', () => ({
  ...jest.requireActual('axios'),
  post: jest.fn(),
}));

const env = 'at23';
const collectionKey = '3a0e0f6e-4b1d-4a2a-9d31-6f8e2b7c1d55';
const workflowId = 'aaaa1111-2222-4333-8444-555566667777';
const context: WorkflowOpsContext = { org, env, app, collectionKey };

const workflow = (overallStatus: PersistentItemStatus): WorkflowStatus => ({
  databaseId: workflowId,
  collectionKey,
  operationId: 'process/next',
  idempotencyKey: 'key-1',
  namespace: `${org}/${app}`,
  createdAt: '2026-08-02T10:00:00Z',
  overallStatus,
  steps: [],
});

const retryButton = () =>
  screen.getByRole('button', { name: textMock('admin.workflows.actions.retry') });
const abandonButton = () =>
  screen.getByRole('button', { name: textMock('admin.workflows.actions.abandon') });
const confirmButton = (key: string) => screen.getByRole('button', { name: textMock(key) });

describe('WorkflowActions', () => {
  beforeEach(() => {
    jest.mocked(axios.post).mockResolvedValue({ status: 202, data: {} } as AxiosResponse);
  });
  afterEach(jest.clearAllMocks);

  it.each<PersistentItemStatus>(['Failed', 'Canceled', 'DependencyFailed'])(
    'offers both ops verbs on a %s workflow',
    (status) => {
      renderWorkflowActions(workflow(status));
      expect(retryButton()).toBeInTheDocument();
      expect(abandonButton()).toBeInTheDocument();
    },
  );

  it.each<PersistentItemStatus>(['Completed', 'Enqueued', 'Processing', 'Waiting'])(
    'offers nothing on a %s workflow',
    (status) => {
      const { container } = renderWorkflowActions(workflow(status));
      expect(container).toBeEmptyDOMElement();
    },
  );

  it('offers only retry on an already written-off workflow', () => {
    renderWorkflowActions(workflow('Abandoned'));
    expect(retryButton()).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: textMock('admin.workflows.actions.abandon') }),
    ).not.toBeInTheDocument();
  });

  it('asks for confirmation before retrying, and does nothing until confirmed', async () => {
    const user = userEvent.setup();
    renderWorkflowActions(workflow('Failed'));

    await user.click(retryButton());

    expect(
      screen.getByText(textMock('admin.workflows.actions.retry.description')),
    ).toBeInTheDocument();
    expect(axios.post).not.toHaveBeenCalled();

    await user.click(confirmButton('admin.workflows.actions.retry.confirm'));

    await waitFor(() => expect(axios.post).toHaveBeenCalledTimes(1));
    expect(jest.mocked(axios.post).mock.calls[0][0]).toBe(
      `/designer/api/v1/admin/workflows/${org}/${env}/${app}/workflows/${workflowId}/resume?cascade=true`,
    );
  });

  it('asks for confirmation before writing a failure off', async () => {
    const user = userEvent.setup();
    renderWorkflowActions(workflow('Failed'));

    await user.click(abandonButton());

    expect(
      screen.getByText(textMock('admin.workflows.actions.abandon.description')),
    ).toBeInTheDocument();
    expect(axios.post).not.toHaveBeenCalled();

    await user.click(confirmButton('admin.workflows.actions.abandon.confirm'));

    await waitFor(() => expect(axios.post).toHaveBeenCalledTimes(1));
    expect(jest.mocked(axios.post).mock.calls[0][0]).toBe(
      `/designer/api/v1/admin/workflows/${org}/${env}/${app}/workflows/${workflowId}/abandon`,
    );
  });

  it('invalidates the drill-down, the health column and the discovery view after a verb', async () => {
    const user = userEvent.setup();
    const client = createQueryClientMock();
    const invalidateQueries = jest.spyOn(client, 'invalidateQueries');
    renderWorkflowActions(workflow('Failed'), client);

    await user.click(retryButton());
    await user.click(confirmButton('admin.workflows.actions.retry.confirm'));

    await waitFor(() => expect(invalidateQueries).toHaveBeenCalledTimes(3));
    const invalidatedKeys = invalidateQueries.mock.calls.map(([filters]) => filters?.queryKey);
    expect(invalidatedKeys).toEqual([
      [QueryKey.AppInstanceWorkflows, org, env, app, collectionKey],
      [QueryKey.AppInstancesWorkflowHealth, org, env, app],
      [QueryKey.AppWorkflowProblems, org, env, app],
    ]);
  });

  it('surfaces a failed verb without a global toast', async () => {
    const user = userEvent.setup();
    jest.mocked(axios.post).mockRejectedValue(new Error('boom'));
    renderWorkflowActions(workflow('Failed'));

    await user.click(retryButton());
    await user.click(confirmButton('admin.workflows.actions.retry.confirm'));

    expect(await screen.findByText(textMock('admin.workflows.actions.error'))).toBeInTheDocument();
  });

  it('confirms success in place', async () => {
    const user = userEvent.setup();
    renderWorkflowActions(workflow('Failed'));

    await user.click(retryButton());
    await user.click(confirmButton('admin.workflows.actions.retry.confirm'));

    expect(
      await screen.findByText(textMock('admin.workflows.actions.retry.success')),
    ).toBeInTheDocument();
  });
});

const renderWorkflowActions = (
  workflowToRender: WorkflowStatus,
  client: QueryClient = createQueryClientMock(),
) =>
  render(
    <QueryClientProvider client={client}>
      <WorkflowActions context={context} workflow={workflowToRender} />
    </QueryClientProvider>,
  );
