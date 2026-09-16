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

const workflow = (
  overallStatus: PersistentItemStatus,
  extra: Partial<WorkflowStatus> = {},
): WorkflowStatus => ({
  databaseId: workflowId,
  collectionKey,
  operationId: 'process/next',
  idempotencyKey: 'key-1',
  namespace: `${org}/${app}`,
  createdAt: '2026-08-02T10:00:00Z',
  overallStatus,
  steps: [],
  ...extra,
});

const failedAfter = (wasRetryable: boolean): WorkflowStatus =>
  workflow('Failed', {
    steps: [
      {
        databaseId: 'step-1',
        operationId: 'app-command',
        processingOrder: 0,
        status: 'Failed',
        command: { type: 'app' },
        retryCount: 0,
        errorHistory: [{ timestamp: '2026-08-02T10:04:00Z', message: 'Boom', wasRetryable }],
      },
    ],
  });

const retryButton = () =>
  screen.getByRole('button', { name: textMock('admin.workflows.actions.retry') });
const abandonButton = () =>
  screen.getByRole('button', { name: textMock('admin.workflows.actions.abandon') });
const nudgeButton = () =>
  screen.getByRole('button', { name: textMock('admin.workflows.actions.nudge') });
const failButton = () =>
  screen.getByRole('button', { name: textMock('admin.workflows.actions.fail') });
const queryButton = (key: string) => screen.queryByRole('button', { name: textMock(key) });
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

  it.each<PersistentItemStatus>(['Completed', 'Enqueued', 'Processing', 'Held'])(
    'offers nothing on a %s workflow',
    (status) => {
      const { container } = renderWorkflowActions(workflow(status));
      expect(container).toBeEmptyDOMElement();
    },
  );

  it.each<PersistentItemStatus>(['Requeued', 'Waiting'])(
    'offers run-now and give-up, and nothing else, on a %s workflow',
    (status) => {
      renderWorkflowActions(workflow(status));
      expect(nudgeButton()).toBeInTheDocument();
      expect(failButton()).toBeInTheDocument();
      expect(queryButton('admin.workflows.actions.retry')).not.toBeInTheDocument();
      expect(queryButton('admin.workflows.actions.abandon')).not.toBeInTheDocument();
    },
  );

  it('runs a parked workflow now only once confirmed', async () => {
    const user = userEvent.setup();
    const { rerenderWith } = renderWorkflowActions(workflow('Requeued'));

    await user.click(nudgeButton());
    expect(
      screen.getByText(textMock('admin.workflows.actions.nudge.description')),
    ).toBeInTheDocument();
    expect(axios.post).not.toHaveBeenCalled();

    await user.click(confirmButton('admin.workflows.actions.nudge.confirm'));

    await waitFor(() => expect(axios.post).toHaveBeenCalledTimes(1));
    expect(jest.mocked(axios.post).mock.calls[0][0]).toBe(
      `/designer/api/v1/admin/workflows/${org}/${env}/${app}/workflows/${workflowId}/nudge`,
    );
    rerenderWith(workflow('Processing'));
    expect(
      await screen.findByText(textMock('admin.workflows.actions.nudge.success')),
    ).toBeInTheDocument();
  });

  it('gives up on a parked workflow only once confirmed, sending no reason of its own', async () => {
    const user = userEvent.setup();
    renderWorkflowActions(workflow('Waiting'));

    await user.click(failButton());
    expect(
      screen.getByText(textMock('admin.workflows.actions.fail.description')),
    ).toBeInTheDocument();
    expect(axios.post).not.toHaveBeenCalled();

    await user.click(confirmButton('admin.workflows.actions.fail.confirm'));

    await waitFor(() => expect(axios.post).toHaveBeenCalledTimes(1));
    expect(jest.mocked(axios.post).mock.calls[0]).toEqual([
      `/designer/api/v1/admin/workflows/${org}/${env}/${app}/workflows/${workflowId}/fail`,
    ]);
  });

  it('drops a run-now outcome once the workflow parks again', async () => {
    const user = userEvent.setup();
    const { rerenderWith } = renderWorkflowActions(workflow('Requeued'));

    await user.click(nudgeButton());
    await user.click(confirmButton('admin.workflows.actions.nudge.confirm'));
    rerenderWith(workflow('Processing'));
    expect(
      await screen.findByText(textMock('admin.workflows.actions.nudge.success')),
    ).toBeInTheDocument();

    rerenderWith(workflow('Requeued'));

    await waitFor(() =>
      expect(
        screen.queryByText(textMock('admin.workflows.actions.nudge.success')),
      ).not.toBeInTheDocument(),
    );
    expect(nudgeButton()).toBeInTheDocument();
  });

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

  it('gives the initial focus to Cancel, never to the confirm button', async () => {
    const user = userEvent.setup();
    // An already written-off workflow offers a single verb, so there is one dialog to look in.
    renderWorkflowActions(workflow('Abandoned'));

    await user.click(retryButton());

    // Pressing Enter as the dialog appears must not confirm it unread.
    expect(screen.getByRole('button', { name: textMock('general.cancel') })).toHaveFocus();
    expect(confirmButton('admin.workflows.actions.retry.confirm')).not.toHaveFocus();
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

  it('invalidates the engine-backed views and the Storage-backed instance views after a verb', async () => {
    const user = userEvent.setup();
    const client = createQueryClientMock();
    const invalidateQueries = jest.spyOn(client, 'invalidateQueries');
    renderWorkflowActions(workflow('Failed'), client);

    await user.click(retryButton());
    await user.click(confirmButton('admin.workflows.actions.retry.confirm'));

    await waitFor(() => expect(invalidateQueries).toHaveBeenCalledTimes(5));
    const invalidatedKeys = invalidateQueries.mock.calls.map(([filters]) => filters?.queryKey);
    expect(invalidatedKeys).toEqual([
      [QueryKey.AppInstanceWorkflows, org, env, app, collectionKey],
      [QueryKey.AppInstancesWorkflowHealth, org, env, app],
      [QueryKey.AppWorkflowProblems, org, env, app],
      [QueryKey.AppInstances, org, env, app],
      [QueryKey.AppInstanceDetails, org, env, app],
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

  it('warns before a retry when the engine classed the last error as permanent', async () => {
    const user = userEvent.setup();
    renderWorkflowActions(failedAfter(false));

    await user.click(retryButton());

    expect(
      screen.getByText(textMock('admin.workflows.actions.retry.non_retryable_hint'), {
        exact: false,
      }),
    ).toBeInTheDocument();
  });

  it('does not warn when the last error was one the engine retried', async () => {
    const user = userEvent.setup();
    renderWorkflowActions(failedAfter(true));

    await user.click(retryButton());

    expect(
      screen.queryByText(textMock('admin.workflows.actions.retry.non_retryable_hint'), {
        exact: false,
      }),
    ).not.toBeInTheDocument();
  });

  it('says how many dependents the cascade resumed along with the workflow', async () => {
    const user = userEvent.setup();
    jest.mocked(axios.post).mockResolvedValue({
      status: 202,
      data: { workflowId, resumedAt: '2026-08-02T10:10:00Z', cascadeResumed: ['dep-1', 'dep-2'] },
    } as AxiosResponse);
    const { rerenderWith } = renderWorkflowActions(workflow('Failed'));

    await user.click(retryButton());
    await user.click(confirmButton('admin.workflows.actions.retry.confirm'));
    rerenderWith(workflow('Enqueued'));

    expect(
      await screen.findByText(
        textMock('admin.workflows.actions.retry.success_with_dependents', { count: 2 }),
      ),
    ).toBeInTheDocument();
  });

  it('confirms success in place once the retried workflow has left the failed state', async () => {
    const user = userEvent.setup();
    const { rerenderWith } = renderWorkflowActions(workflow('Failed'));

    await user.click(retryButton());
    await user.click(confirmButton('admin.workflows.actions.retry.confirm'));
    await waitFor(() => expect(axios.post).toHaveBeenCalledTimes(1));

    // Resuming enqueues the workflow, and the invalidated drill-down comes back with it in the
    // status the verb produced — so the verbs are gone by the time the outcome is known.
    rerenderWith(workflow('Enqueued'));

    expect(
      await screen.findByText(textMock('admin.workflows.actions.retry.success')),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: textMock('admin.workflows.actions.retry') }),
    ).not.toBeInTheDocument();
  });

  it('drops the previous outcome once the same workflow fails again', async () => {
    const user = userEvent.setup();
    const { rerenderWith } = renderWorkflowActions(workflow('Failed'));

    await user.click(retryButton());
    await user.click(confirmButton('admin.workflows.actions.retry.confirm'));
    rerenderWith(workflow('Enqueued'));
    expect(
      await screen.findByText(textMock('admin.workflows.actions.retry.success')),
    ).toBeInTheDocument();

    // Resume reuses the workflow id, so the item is never remounted: a stale "queued again" next to
    // the verbs for the new failure would read as if this failure had already been handled.
    rerenderWith(workflow('Failed'));

    await waitFor(() =>
      expect(
        screen.queryByText(textMock('admin.workflows.actions.retry.success')),
      ).not.toBeInTheDocument(),
    );
    expect(retryButton()).toBeInTheDocument();
  });
});

const renderWorkflowActions = (
  workflowToRender: WorkflowStatus,
  client: QueryClient = createQueryClientMock(),
) => {
  const actionsWith = (workflowToShow: WorkflowStatus) => (
    <QueryClientProvider client={client}>
      <WorkflowActions context={context} workflow={workflowToShow} />
    </QueryClientProvider>
  );
  const { rerender, ...renderResult } = render(actionsWith(workflowToRender));
  return { ...renderResult, rerenderWith: (next: WorkflowStatus) => rerender(actionsWith(next)) };
};
