import { describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import type { QueryClient } from '@tanstack/react-query';
import axios, { AxiosError, type AxiosResponse, type AxiosStatic } from 'axios';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import { textMock } from '@studio/testing/mocks/i18nMock';
import { app, org } from '@studio/testing/testids';
import { OrgContext } from 'admin/contexts/OrgContext';
import { formatDay, formatTimeOfDay } from 'admin/features/apps/utils/formatTimestamp';
import { InstanceWorkflows } from './InstanceWorkflows';

vi.mock('axios', async () => {
  const actual = await vi.importActual<{ default: AxiosStatic }>('axios');
  return { ...actual, default: { ...actual.default, get: vi.fn(), post: vi.fn() } };
});

const environment = 'at23';
const envTitle = `${textMock('general.test_environment_alt').toLowerCase()} ${environment.toUpperCase()}`;
const orgMock = { username: org, full_name: 'Test Org', avatar_url: '', id: 1 };

const instanceId = '3a0e0f6e-4b1d-4a2a-9d31-6f8e2b7c1d55';
const headWorkflowId = 'aaaa1111-2222-4333-8444-555566667777';
const auxiliaryWorkflowId = 'bbbb1111-2222-4333-8444-555566667777';

const problemMessage =
  'AppCommand execution failed with status code InternalServerError: {"title":"PdfGenerationException","status":500,"detail":"Could not generate the PDF"}';
/** The same message as the view lays it out: the JSON body under the prefix, whitespace collapsed. */
const shownProblemMessage =
  'AppCommand execution failed with status code InternalServerError: { "title": "PdfGenerationException", "status": 500, "detail": "Could not generate the PDF" }';

const failedPrimaryWorkflow = {
  databaseId: headWorkflowId,
  collectionKey: instanceId,
  operationId: 'Process next: Pdf -> Sign',
  idempotencyKey: 'key-1',
  namespace: `${org}/${app}`,
  createdAt: '2026-08-02T10:00:00Z',
  updatedAt: '2026-08-02T10:05:00Z',
  role: 'Primary',
  overallStatus: 'Failed',
  steps: [
    {
      databaseId: 'step-1',
      operationId: 'app-command',
      processingOrder: 0,
      // A step that stopped waiting keeps the reason it last waited for: it is history, not a live
      // block, and the engine leaves it on the step either way.
      status: 'Failed',
      command: { type: 'AppCommand' },
      retryCount: 3,
      deferCount: 2,
      lastDeferReason: 'venter på signering',
      errorHistory: [
        {
          timestamp: '2026-08-02T10:02:00Z',
          message: 'Boom went the pipeline',
          httpStatusCode: 503,
          wasRetryable: true,
        },
        {
          timestamp: '2026-08-02T10:04:00Z',
          message: problemMessage,
          httpStatusCode: 500,
          wasRetryable: false,
        },
      ],
    },
    {
      databaseId: 'step-2',
      operationId: 'send-eformidling',
      processingOrder: 1,
      status: 'Waiting',
      command: { type: 'AppCommand' },
      retryCount: 0,
      deferCount: 1,
      lastDeferReason: 'venter på kvittering',
    },
  ],
};

const settledAuxiliaryWorkflow = {
  databaseId: auxiliaryWorkflowId,
  collectionKey: instanceId,
  operationId: 'side-effects',
  idempotencyKey: 'key-2',
  namespace: `${org}/${app}`,
  createdAt: '2026-08-01T10:00:00Z',
  overallStatus: 'Completed',
  role: 'Auxiliary',
  steps: [],
};

const workflowsResponse = {
  data: [settledAuxiliaryWorkflow, failedPrimaryWorkflow],
  pageSize: 25,
  totalCount: 2,
  nextCursor: null,
};

describe('InstanceWorkflows', () => {
  it('lists the instance workflows in the order the process ran them, marking the auxiliary workflow', async () => {
    vi.mocked(axios.get).mockResolvedValue({
      status: 200,
      data: workflowsResponse,
    } as AxiosResponse);
    renderInstanceWorkflows();

    const summaries = await screen.findAllByTestId('workflow-row');
    expect(summaries).toHaveLength(2);
    expect(summaries[0]).toHaveTextContent('side-effects');
    expect(summaries[0]).toHaveTextContent(textMock('admin.workflows.auxiliary_workflow'));
    expect(within(summaries[1]).getByTitle('Process next: Pdf -> Sign')).toBeInTheDocument();

    const requestedUrl = vi.mocked(axios.get).mock.calls[0][0] as string;
    expect(requestedUrl).toContain(`collectionKey=${instanceId}`);
  });

  it('shows the workflows of one transition as one row, speaking for the one it stopped at', async () => {
    const stepOf = (operationId: string, processingOrder: number, status = 'Completed') => ({
      databaseId: `step-${operationId}`,
      operationId,
      processingOrder,
      status,
      command: { type: 'AppCommand' },
      retryCount: 0,
    });
    const workflowOf = (
      databaseId: string,
      operationId: string,
      labels: Record<string, string>,
      steps: ReturnType<typeof stepOf>[],
      overallStatus = 'Completed',
    ) => ({
      databaseId,
      collectionKey: instanceId,
      operationId,
      idempotencyKey: databaseId,
      namespace: `${org}/${app}`,
      createdAt: '2026-08-02T10:00:00Z',
      role: 'Primary',
      overallStatus,
      labels,
      steps,
    });
    vi.mocked(axios.get).mockResolvedValue({
      status: 200,
      data: {
        ...workflowsResponse,
        data: [
          workflowOf(
            'wf-acquire',
            'Process next: Mark instance as processing',
            { processNextSourceId: 'Form:2' },
            [stepOf('AcquireProcessingStatus', 0)],
          ),
          workflowOf(
            'wf-transition',
            'Process next: Form -> Approval',
            { processNextSourceId: 'Form:2', processNextTargetId: 'Approval:4' },
            [stepOf('EndTask', 0), stepOf('StartTask', 1), stepOf('ExecuteServiceTask: 0', 2)],
          ),
          workflowOf(
            'wf-receive',
            'Mailbox receive: Approval · 0',
            { processNextTargetId: 'Approval:4' },
            [stepOf('ExecuteServiceTask: 1', 0, 'Held')],
            'Held',
          ),
        ],
      },
    } as AxiosResponse);
    renderInstanceWorkflows();

    const rows = await screen.findAllByTestId('workflow-row');
    expect(rows).toHaveLength(1);
    const [row] = rows;
    expect(within(row).getByTitle('Process next: Form -> Approval')).toBeInTheDocument();
    expect(
      within(row).getAllByText(textMock('admin.workflows.status.held')).length,
    ).toBeGreaterThan(0);
    expect(within(row).getByText('AcquireProcessingStatus')).toBeInTheDocument();
    // A service task's steps are named by their position, the one in its own workflow as answering.
    expect(
      within(row).getByText(textMock('admin.workflows.step.position.stage', { number: 1 })),
    ).toBeInTheDocument();
    expect(
      within(row).getAllByText(textMock('admin.workflows.step.position.replies', { number: 2 }))
        .length,
    ).toBeGreaterThan(0);
  });

  it('opens the transition that spawned a failed auxiliary workflow, with its error and retry in view', async () => {
    const transition = {
      ...failedPrimaryWorkflow,
      databaseId: 'wf-transition',
      operationId: 'Process next: Form -> Verify',
      overallStatus: 'Completed',
      createdAt: '2026-08-02T09:00:00Z',
      labels: { processNextTargetId: 'Verify:3' },
      steps: [{ ...failedPrimaryWorkflow.steps[0], status: 'Completed', errorHistory: [] }],
    };
    const failedAuxiliaryWorkflow = {
      ...settledAuxiliaryWorkflow,
      databaseId: 'wf-auxiliary-failed',
      operationId: 'Process next side-effects: Form -> Verify \u00b7 MovedToAltinnEvent',
      overallStatus: 'Failed',
      createdAt: '2026-08-02T09:00:05Z',
      labels: { processNextTargetId: 'Verify:3' },
      steps: [{ ...failedPrimaryWorkflow.steps[0], databaseId: 'auxiliary-step' }],
    };
    vi.mocked(axios.get).mockResolvedValue({
      status: 200,
      data: { ...workflowsResponse, data: [transition, failedAuxiliaryWorkflow] },
    } as AxiosResponse);
    renderInstanceWorkflows();

    // One row: the auxiliary workflow lives behind the transition that spawned it, and the row
    // says so.
    const rows = await screen.findAllByTestId('workflow-row');
    expect(rows).toHaveLength(1);
    expect(rows[0]).toHaveAttribute('open');
    expect(rows[0]).toHaveTextContent(
      textMock('admin.workflows.row.auxiliary_workflows_failed', { count: 1 }),
    );

    // Opened, so the failure and the way out of it are in view without a click.
    expect(within(rows[0]).getByText(shownProblemMessage)).toBeVisible();
    expect(
      within(rows[0]).getByRole('button', { name: textMock('admin.workflows.actions.retry') }),
    ).toBeVisible();
  });

  it('draws an auxiliary workflow right under its transition, even when it came in after the next one', async () => {
    const transition = (databaseId: string, target: string, createdAt: string) => ({
      ...failedPrimaryWorkflow,
      databaseId,
      operationId: `Process next: ${target}`,
      overallStatus: 'Completed',
      createdAt,
      labels: { processNextTargetId: target },
      steps: [],
    });
    const lateAuxiliaryWorkflow = {
      ...settledAuxiliaryWorkflow,
      databaseId: 'wf-auxiliary-late',
      operationId: 'Process next side-effects: Form:2 · MovedToAltinnEvent',
      createdAt: '2026-08-01T10:03:00Z',
      labels: { processNextTargetId: 'Form:2' },
    };
    vi.mocked(axios.get).mockResolvedValue({
      status: 200,
      data: {
        ...workflowsResponse,
        data: [
          lateAuxiliaryWorkflow,
          transition('wf-verify', 'Verify:3', '2026-08-01T10:02:00Z'),
          transition('wf-form', 'Form:2', '2026-08-01T10:01:00Z'),
        ],
      },
    } as AxiosResponse);
    renderInstanceWorkflows();

    const rows = await screen.findAllByTestId('workflow-row');
    expect(rows.map((row) => within(row).getByTitle(/^Process next: /).title)).toEqual([
      'Process next: Form:2',
      'Process next: Verify:3',
    ]);
    // The late auxiliary workflow is filed behind its own transition, not the one that came after
    // it.
    expect(within(rows[0]).getByTestId('auxiliary-workflow-row')).toHaveTextContent(
      'MovedToAltinnEvent',
    );
    expect(within(rows[1]).queryByTestId('auxiliary-workflow-row')).not.toBeInTheDocument();
  });

  it('shows per-step status, retries and the error history', async () => {
    vi.mocked(axios.get).mockResolvedValue({
      status: 200,
      data: workflowsResponse,
    } as AxiosResponse);
    renderInstanceWorkflows();

    expect(await screen.findByRole('cell', { name: 'app-command' })).toBeInTheDocument();
    // The failed attempts, counted from the step's error history.
    expect(screen.getByRole('cell', { name: '2' })).toBeInTheDocument();
    // The latest error is in full; the earlier one — the same failure, one attempt earlier —
    // waits behind a toggle.
    expect(screen.getByText(shownProblemMessage)).toBeVisible();
    expect(screen.getByText('Boom went the pipeline')).not.toBeVisible();
    expect(
      screen.getByText(textMock('admin.workflows.step.defer_count', { times: 2 })),
    ).toBeInTheDocument();
  });

  describe('auxiliary workflows with multiple steps', () => {
    const transition = {
      ...failedPrimaryWorkflow,
      databaseId: 'wf-transition',
      operationId: 'Process next: Form -> Verify',
      overallStatus: 'Completed',
      createdAt: '2026-08-02T09:00:00Z',
      labels: { processNextTargetId: 'Verify:3' },
      steps: [],
    };
    const stepOf = (operationId: string, processingOrder: number, status = 'Completed') => ({
      databaseId: `step-${operationId}`,
      operationId,
      processingOrder,
      status,
      command: { type: 'AppCommand' },
      retryCount: 0,
      errorHistory: [],
    });
    const archive = {
      ...settledAuxiliaryWorkflow,
      databaseId: 'wf-archive',
      operationId: 'Process next side-effects: Form -> Verify · Archive',
      createdAt: '2026-08-02T09:00:01Z',
      labels: transition.labels,
      // The API's array order must not decide the order shown to the operator.
      steps: [
        stepOf('Confirm delivery', 2),
        stepOf('Prepare archive', 0),
        stepOf('Send archive', 1),
      ],
    };
    const respondWith = (...sideFlows: object[]) =>
      vi.mocked(axios.get).mockResolvedValue({
        status: 200,
        data: { ...workflowsResponse, data: [transition, ...sideFlows] },
      } as AxiosResponse);

    it('expands each flow independently and lists all its steps in execution order', async () => {
      const user = userEvent.setup();
      respondWith(archive, {
        ...archive,
        databaseId: 'wf-notify',
        operationId: 'Process next side-effects: Form -> Verify · Notify',
        steps: [stepOf('Send notification', 0)],
      });
      renderInstanceWorkflows();

      const [row] = await screen.findAllByTestId('workflow-row');
      await user.click(within(row).getByTitle(transition.operationId));
      const archiveToggle = within(row).getByRole('button', { name: 'Archive' });
      const notifyToggle = within(row).getByRole('button', { name: 'Notify' });
      expect(archiveToggle).toHaveAttribute('aria-expanded', 'false');
      expect(notifyToggle).toHaveAttribute('aria-expanded', 'false');
      expect(within(row).queryByRole('cell', { name: 'Prepare archive' })).not.toBeInTheDocument();
      expect(within(row).getAllByTestId('auxiliary-workflow-row')[0]).toHaveTextContent(
        textMock('admin.workflows.row.steps', { completed: 3, total: 3 }),
      );

      await user.click(archiveToggle);
      expect(archiveToggle).toHaveAttribute('aria-expanded', 'true');
      const stepNames = within(row)
        .getAllByRole('cell')
        .filter((cell) => cell.classList.contains('auxiliaryWorkflowStep'))
        .map((cell) => cell.textContent);
      expect(stepNames).toEqual(['Prepare archive', 'Send archive', 'Confirm delivery']);
      expect(
        within(row).queryByRole('cell', { name: 'Send notification' }),
      ).not.toBeInTheDocument();

      await user.click(notifyToggle);
      await user.click(archiveToggle);
      expect(within(row).getByRole('cell', { name: 'Send notification' })).toBeVisible();
      expect(within(row).queryByRole('cell', { name: 'Prepare archive' })).not.toBeInTheDocument();
    });

    it('opens a failed flow with every step, retains earlier history, and retries that flow', async () => {
      const user = userEvent.setup();
      const recoveredError = 'Archive preparation failed before recovering';
      respondWith({
        ...archive,
        overallStatus: 'Failed',
        steps: [
          {
            ...stepOf('Prepare archive', 0),
            errorHistory: [{ timestamp: '2026-08-02T09:00:02Z', message: recoveredError }],
          },
          { ...failedPrimaryWorkflow.steps[0], operationId: 'Send archive', processingOrder: 1 },
          stepOf('Confirm delivery', 2, 'Enqueued'),
        ],
      });
      vi.mocked(axios.post).mockResolvedValue({ status: 202, data: {} } as AxiosResponse);
      renderInstanceWorkflows();

      const [row] = await screen.findAllByTestId('workflow-row');
      expect(row).toHaveAttribute('open');
      expect(within(row).getByRole('button', { name: 'Archive' })).toHaveAttribute(
        'aria-expanded',
        'true',
      );
      expect(within(row).getByRole('cell', { name: 'Prepare archive' })).toBeVisible();
      expect(within(row).getByRole('cell', { name: 'Send archive' })).toBeVisible();
      expect(within(row).getByRole('cell', { name: 'Confirm delivery' })).toBeVisible();
      expect(within(row).getByTestId('auxiliary-workflow-row')).toHaveTextContent(
        textMock('admin.workflows.row.steps', { completed: 1, total: 3 }),
      );
      expect(within(row).getByText(shownProblemMessage)).toBeVisible();
      expect(within(row).getByText(recoveredError)).not.toBeVisible();
      await user.click(
        within(row).getByText(textMock('admin.workflows.step.resolved_errors', { count: 1 })),
      );
      expect(within(row).getByText(recoveredError)).toBeVisible();

      await user.click(
        within(row).getByRole('button', { name: textMock('admin.workflows.actions.retry') }),
      );
      await user.click(
        screen.getByRole('button', { name: textMock('admin.workflows.actions.retry.confirm') }),
      );
      await waitFor(() => expect(axios.post).toHaveBeenCalledTimes(1));
      expect(vi.mocked(axios.post).mock.calls[0][0]).toContain('/workflows/wf-archive/resume');
    });

    it('still offers retry when a failed flow has no steps', async () => {
      respondWith({ ...archive, overallStatus: 'DependencyFailed', steps: [] });
      renderInstanceWorkflows();

      const [row] = await screen.findAllByTestId('workflow-row');
      expect(within(row).getByRole('button', { name: 'Archive' })).toHaveAttribute(
        'aria-expanded',
        'true',
      );
      expect(
        within(row).getByRole('button', { name: textMock('admin.workflows.actions.retry') }),
      ).toBeVisible();
    });
  });

  it('marks the step being executed', async () => {
    const runningPrimaryWorkflow = {
      ...failedPrimaryWorkflow,
      overallStatus: 'Processing',
      steps: [{ ...failedPrimaryWorkflow.steps[0], status: 'Processing', errorHistory: [] }],
    };
    vi.mocked(axios.get).mockResolvedValue({
      status: 200,
      data: { ...workflowsResponse, data: [runningPrimaryWorkflow] },
    } as AxiosResponse);
    renderInstanceWorkflows();

    expect(await screen.findByTitle('app-command · Processing')).toHaveAttribute('data-live');
  });

  it("puts a step's errors in the background once it has succeeded, but keeps them", async () => {
    const user = userEvent.setup();
    const recoveredPrimaryWorkflow = {
      ...failedPrimaryWorkflow,
      overallStatus: 'Completed',
      steps: [{ ...failedPrimaryWorkflow.steps[0], status: 'Completed' }],
    };
    vi.mocked(axios.get).mockResolvedValue({
      status: 200,
      data: { ...workflowsResponse, data: [recoveredPrimaryWorkflow] },
    } as AxiosResponse);
    renderInstanceWorkflows();

    const [row] = await screen.findAllByTestId('workflow-row');
    await user.click(within(row).getByTitle('Process next: Pdf -> Sign'));
    // No alert for a failure that is over; the history folds under a line that says it happened.
    expect(screen.getByText(shownProblemMessage)).not.toBeVisible();
    expect(
      within(row).getByText(textMock('admin.workflows.step.resolved_errors', { count: 2 })),
    ).toBeInTheDocument();
    // And the row itself says so: the step's dot is amber, and says why on hover.
    expect(
      within(row).getByTitle(
        `app-command · Completed · ${textMock('admin.workflows.row.had_errors')}`,
      ),
    ).toHaveAttribute('data-tone', 'warning');
  });

  describe('the story of the instance', () => {
    const stepOf = (operationId: string, processingOrder: number) => ({
      ...failedPrimaryWorkflow.steps[0],
      databaseId: `step-${operationId}`,
      operationId,
      processingOrder,
      status: 'Completed',
      errorHistory: [],
      lastDeferReason: undefined,
      deferCount: 0,
      retryCount: 0,
    });
    const transition = (
      databaseId: string,
      operationId: string,
      createdAt: string,
      updatedAt: string,
      steps = [stepOf('StartTask', 0)],
    ) => ({
      ...failedPrimaryWorkflow,
      databaseId,
      operationId,
      overallStatus: 'Completed',
      createdAt,
      updatedAt,
      steps,
    });
    const respondWith = (data: object[]) =>
      vi.mocked(axios.get).mockResolvedValue({
        status: 200,
        data: { ...workflowsResponse, data },
      } as AxiosResponse);

    it('heads the steps of each phase with the task it ends or starts, and nothing else', async () => {
      const user = userEvent.setup();
      respondWith([
        transition(
          'wf-form-verify',
          'Process next: Form -> Verify',
          '2026-09-21T13:29:56.000Z',
          '2026-09-21T13:29:56.300Z',
          [
            stepOf('EndTask', 0),
            stepOf('LockTaskData', 1),
            stepOf('MutateProcessState', 2),
            stepOf('StartTask', 3),
            stepOf('CommitProcessState', 4),
          ],
        ),
      ]);
      renderInstanceWorkflows();

      await user.click(await screen.findByTitle('Process next: Form -> Verify'));
      const [, body] = within(screen.getByRole('table')).getAllByRole('rowgroup');
      const firstCells = within(body)
        .getAllByRole('row')
        .flatMap((row) => within(row).queryAllByRole('cell').slice(0, 1))
        .map((cell) => cell.textContent);
      expect(firstCells).toEqual([
        'Form',
        'EndTask',
        'LockTaskData',
        'MutateProcessState',
        'Verify',
        'StartTask',
        'CommitProcessState',
      ]);
    });

    it('heads each step by the element the app runtime labels it with', async () => {
      const user = userEvent.setup();
      const labeled = (operationId: string, processingOrder: number, element: string) => ({
        ...stepOf(operationId, processingOrder),
        labels: { processNextElement: element },
      });
      respondWith([
        transition(
          'wf-form-verify',
          'Process next: Form -> Verify',
          '2026-09-21T13:29:56.000Z',
          '2026-09-21T13:29:56.300Z',
          [
            labeled('EndTask', 0, 'Form'),
            labeled('SomeNewTaskEndingCommand', 1, 'Form'),
            stepOf('MutateProcessState', 2),
            labeled('StartTask', 3, 'Verify'),
            stepOf('CommitProcessState', 4),
          ],
        ),
      ]);
      renderInstanceWorkflows();

      await user.click(await screen.findByTitle('Process next: Form -> Verify'));
      const [, body] = within(screen.getByRole('table')).getAllByRole('rowgroup');
      const firstCells = within(body)
        .getAllByRole('row')
        .flatMap((row) => within(row).queryAllByRole('cell').slice(0, 1))
        .map((cell) => cell.textContent);
      expect(firstCells).toEqual([
        'Form',
        'EndTask',
        'SomeNewTaskEndingCommand',
        'MutateProcessState',
        'Verify',
        'StartTask',
        'CommitProcessState',
      ]);
      // Set in under the Form heading by its label alone: the command-name map does not know it.
      expect(within(body).getByRole('cell', { name: 'SomeNewTaskEndingCommand' })).toHaveClass(
        'groupedCell',
      );
      expect(within(body).getByRole('cell', { name: 'MutateProcessState' })).not.toHaveClass(
        'groupedCell',
      );
    });

    it('names a transition by its tasks alone, with the whole id as a tooltip', async () => {
      respondWith([
        transition(
          'wf-one',
          'Process next: Form -> Verify',
          '2026-09-21T13:29:56.000Z',
          '2026-09-21T13:29:56.286Z',
        ),
      ]);
      renderInstanceWorkflows();

      const [row] = await screen.findAllByTestId('workflow-row');
      const name = within(row).getByTitle('Process next: Form -> Verify');
      expect(name).toHaveTextContent(/^Form → Verify$/);
    });

    it('gives the date once over the rows, and again where a new day starts', async () => {
      const firstDay = '2026-09-21T10:00:00.000Z';
      const sameDay = '2026-09-21T10:05:00.000Z';
      const nextDay = '2026-09-23T10:00:00.000Z';
      respondWith([
        transition('wf-start', 'Process next: StartEvent_1 -> Form', firstDay, firstDay),
        transition('wf-form', 'Process next: Form -> Verify', sameDay, sameDay),
        transition('wf-verify', 'Process next: Verify -> Sign', nextDay, nextDay),
      ]);
      renderInstanceWorkflows();

      const rows = await screen.findAllByTestId('workflow-row');
      expect(screen.getByText(formatDay(firstDay))).toBeInTheDocument();
      expect(screen.getByText(formatDay(nextDay))).toBeInTheDocument();
      expect(within(rows[1]).getByText(formatTimeOfDay(sameDay))).toBeInTheDocument();
      expect(within(rows[1]).queryByText(formatDay(sameDay))).not.toBeInTheDocument();
    });

    it('says how long a finished workflow took, to the millisecond when under a second', async () => {
      respondWith([
        transition(
          'wf-one',
          'Process next: Form -> Verify',
          '2026-09-21T13:29:56.000Z',
          '2026-09-21T13:29:56.286Z',
        ),
      ]);
      renderInstanceWorkflows();

      const [row] = await screen.findAllByTestId('workflow-row');
      const duration = textMock('admin.workflows.duration.milliseconds', { count: 286 });
      expect(
        within(row).getByLabelText(textMock('admin.workflows.row.duration', { duration })),
      ).toHaveTextContent(duration);
    });
  });

  it('opens nothing and says nothing while nothing needs attention', async () => {
    const completedPrimaryWorkflow = {
      ...failedPrimaryWorkflow,
      overallStatus: 'Completed',
      steps: [],
    };
    vi.mocked(axios.get).mockResolvedValue({
      status: 200,
      data: { ...workflowsResponse, data: [settledAuxiliaryWorkflow, completedPrimaryWorkflow] },
    } as AxiosResponse);
    renderInstanceWorkflows();

    const rows = await screen.findAllByTestId('workflow-row');
    expect(rows.every((row) => !row.hasAttribute('open'))).toBe(true);
  });
  it('opens a workflow that keeps retrying, with its attempts and the countdown in the row', async () => {
    const retryingPrimaryWorkflow = {
      ...failedPrimaryWorkflow,
      overallStatus: 'Requeued',
      backoffUntil: new Date(Date.now() + 40_000).toISOString(),
      steps: [{ ...failedPrimaryWorkflow.steps[0], status: 'Requeued', retryCount: 5 }],
    };
    vi.mocked(axios.get).mockResolvedValue({
      status: 200,
      data: { ...workflowsResponse, data: [retryingPrimaryWorkflow] },
    } as AxiosResponse);
    renderInstanceWorkflows();

    const [row] = await screen.findAllByTestId('workflow-row');
    expect(row).toHaveAttribute('open');
    // The failed attempts sit on the row as a badge, spoken as the sentence it stands for, and
    // are counted from the error history rather than from the engine's retry counter.
    expect(
      within(row).getByLabelText(textMock('admin.workflows.row.attempts', { count: 2 })),
    ).toHaveTextContent('2');
    expect(within(row).getByText(/admin\.workflows\.row\.next_attempt_in/)).toBeInTheDocument();
  });

  it('keeps counting the failed attempts after a manual resume zeroed the retry counter', async () => {
    const resumedWorkflow = {
      ...failedPrimaryWorkflow,
      overallStatus: 'Completed',
      steps: [{ ...failedPrimaryWorkflow.steps[0], status: 'Completed', retryCount: 0 }],
    };
    vi.mocked(axios.get).mockResolvedValue({
      status: 200,
      data: { ...workflowsResponse, data: [resumedWorkflow] },
    } as AxiosResponse);
    renderInstanceWorkflows();

    const [row] = await screen.findAllByTestId('workflow-row');
    expect(
      within(row).getByLabelText(textMock('admin.workflows.row.attempts', { count: 2 })),
    ).toHaveTextContent('2');
  });
  it('says nothing about a next attempt that is only seconds away', async () => {
    const retryingSoon = {
      ...failedPrimaryWorkflow,
      overallStatus: 'Requeued',
      backoffUntil: new Date(Date.now() + 2_000).toISOString(),
      steps: [{ ...failedPrimaryWorkflow.steps[0], status: 'Requeued', retryCount: 1 }],
    };
    vi.mocked(axios.get).mockResolvedValue({
      status: 200,
      data: { ...workflowsResponse, data: [retryingSoon] },
    } as AxiosResponse);
    renderInstanceWorkflows();

    const [row] = await screen.findAllByTestId('workflow-row');
    expect(within(row).queryByText(/admin\.workflows\.row\.next_attempt/)).not.toBeInTheDocument();
    expect(
      within(row).getByRole('img', { name: textMock('admin.workflows.status.requeued') }),
    ).toBeInTheDocument();
  });

  it('says how long a workflow has been running, once it has run a while', async () => {
    const tenMinutesAgo = new Date(Date.now() - 10 * 60_000).toISOString();
    const runningPrimaryWorkflow = {
      ...failedPrimaryWorkflow,
      overallStatus: 'Processing',
      executionStartedAt: tenMinutesAgo,
      updatedAt: tenMinutesAgo,
      steps: [{ ...failedPrimaryWorkflow.steps[0], status: 'Processing', errorHistory: [] }],
    };
    vi.mocked(axios.get).mockResolvedValue({
      status: 200,
      data: { ...workflowsResponse, data: [runningPrimaryWorkflow] },
    } as AxiosResponse);
    renderInstanceWorkflows();

    const [row] = await screen.findAllByTestId('workflow-row');
    expect(within(row).getByText(/admin\.workflows\.row\.running_for/)).toBeInTheDocument();
    // In flight is not a problem: the row stays closed.
    expect(row).not.toHaveAttribute('open');
  });

  it('reads each workflow as a row: its steps, where it stopped, and what went wrong', async () => {
    vi.mocked(axios.get).mockResolvedValue({
      status: 200,
      data: workflowsResponse,
    } as AxiosResponse);
    renderInstanceWorkflows();

    const [settledRow, failedRow] = await screen.findAllByTestId('workflow-row');
    // The status leads every row as an icon; only a row that did not go fine spells it out.
    expect(
      within(failedRow).getByRole('img', { name: textMock('admin.workflows.status.failed') }),
    ).toBeInTheDocument();
    expect(
      within(failedRow).getAllByText(textMock('admin.workflows.status.failed')).length,
    ).toBeGreaterThan(0);
    // One dot per step, in processing order, colored by the step's status.
    expect(within(failedRow).getByTitle('app-command · Failed')).toHaveAttribute(
      'data-tone',
      'danger',
    );
    expect(within(failedRow).getByTitle('send-eformidling · Waiting')).toHaveAttribute(
      'data-tone',
      'info',
    );
    // Named on the row, and again in the open row's step table.
    expect(within(failedRow).getAllByText('app-command').length).toBeGreaterThan(0);
    // A workflow with no steps has no chain to show, and a settled one no error.
    expect(within(settledRow).queryAllByTitle(/ · /)).toHaveLength(0);
    expect(within(failedRow).getByText(shownProblemMessage)).toBeInTheDocument();
    expect(within(settledRow).queryByText(shownProblemMessage)).not.toBeInTheDocument();
  });

  it('opens the row that needs attention from the start, with its error and verbs in view', async () => {
    vi.mocked(axios.get).mockResolvedValue({
      status: 200,
      data: workflowsResponse,
    } as AxiosResponse);
    renderInstanceWorkflows();

    const [settledRow, failedRow] = await screen.findAllByTestId('workflow-row');
    expect(failedRow).toHaveAttribute('open');
    expect(settledRow).not.toHaveAttribute('open');
    expect(within(failedRow).getByText(shownProblemMessage)).toBeInTheDocument();
    // The verbs sit beside the disclosure, over its right edge, for the one row they apply to.
    expect(
      screen.getByRole('button', { name: textMock('admin.workflows.actions.retry') }),
    ).toBeInTheDocument();
  });
  it("lists a step's errors newest first, each with what the engine made of it", async () => {
    vi.mocked(axios.get).mockResolvedValue({
      status: 200,
      data: workflowsResponse,
    } as AxiosResponse);
    renderInstanceWorkflows();

    const user = userEvent.setup();
    const stepTable = await screen.findByRole('table');
    await user.click(
      within(stepTable).getByText(textMock('admin.workflows.step.earlier_errors', { count: 1 })),
    );
    const messages = within(stepTable).getAllByText(
      (_, element) =>
        element?.tagName === 'CODE' &&
        [shownProblemMessage, 'Boom went the pipeline'].includes(
          (element.textContent ?? '').replace(/\s+/g, ' '),
        ),
    );
    expect(messages.map((element) => (element.textContent ?? '').replace(/\s+/g, ' '))).toEqual([
      shownProblemMessage,
      'Boom went the pipeline',
    ]);
    expect(
      within(stepTable).getByText(textMock('admin.workflows.error.http_status', { status: 503 }), {
        exact: false,
      }),
    ).toBeInTheDocument();
    expect(
      within(stepTable).getByText(textMock('admin.workflows.error.non_retryable'), {
        exact: false,
      }),
    ).toBeInTheDocument();
  });

  it('reads the defer reason as live only on the step that is actually waiting', async () => {
    vi.mocked(axios.get).mockResolvedValue({
      status: 200,
      data: workflowsResponse,
    } as AxiosResponse);
    renderInstanceWorkflows();

    expect(
      await screen.findByText(textMock('admin.workflows.step.waiting_reason'), { exact: false }),
    ).toHaveTextContent('venter på kvittering');
    // The failed step's reason is kept for triage, but under a label that says it is history: the
    // step is not blocked on anything any more.
    expect(
      screen.getByText(textMock('admin.workflows.step.last_waiting_reason'), { exact: false }),
    ).toHaveTextContent('venter på signering');
    expect(
      screen.queryByText(textMock('admin.workflows.step.waiting_reason'), { exact: false }),
    ).not.toHaveTextContent('venter på signering');
  });

  it('keeps the loaded workflows when loading more of them fails', async () => {
    const user = userEvent.setup();
    const cursor = 'opaque-cursor';
    vi.mocked(axios.get).mockImplementation(async (url: string) => {
      if (url.includes(`cursor=${cursor}`)) {
        throw new AxiosError();
      }
      return { status: 200, data: { ...workflowsResponse, nextCursor: cursor } } as AxiosResponse;
    });
    renderInstanceWorkflows();

    await screen.findAllByTestId('workflow-row');
    await user.click(screen.getByRole('button', { name: textMock('admin.workflows.fetch_more') }));

    // The query as a whole reports an error, but page one is still valid and still cached.
    expect(
      await screen.findByText(textMock('admin.workflows.fetch_more_error')),
    ).toBeInTheDocument();
    expect(screen.getAllByTestId('workflow-row')).toHaveLength(2);
    expect(screen.queryByText(textMock('general.page_error_title'))).not.toBeInTheDocument();
  });

  it('sets engine free text apart from the Norwegian copy around it', async () => {
    vi.mocked(axios.get).mockResolvedValue({
      status: 200,
      data: workflowsResponse,
    } as AxiosResponse);
    renderInstanceWorkflows();

    const message = await screen.findByText(shownProblemMessage);
    expect(message.tagName).toBe('CODE');
    expect(screen.getByText('venter på kvittering').tagName).toBe('CODE');
    // The operation id in the row is the app runtime's own name for the workflow, in plain text.
    expect(screen.getByTitle('Process next: Pdf -> Sign').tagName).toBe('SPAN');
  });

  it('spells out all three no-data causes when the engine holds nothing', async () => {
    vi.mocked(axios.get).mockResolvedValue({ status: 204, data: '' } as AxiosResponse);
    renderInstanceWorkflows();

    expect(await screen.findByText(textMock('admin.workflows.no_results'))).toBeInTheDocument();
  });

  it('reports an unreachable engine as unavailable', async () => {
    const error = new AxiosError();
    error.response = {
      status: 502,
      data: { type: 'urn:altinn:studio:designer:runtime-gateway-unavailable' },
    } as AxiosResponse;
    vi.mocked(axios.get).mockRejectedValue(error);
    renderInstanceWorkflows();

    expect(
      await screen.findByText(textMock('admin.workflows.unavailable', { envTitle })),
    ).toBeInTheDocument();
  });

  it('does not query the engine when the instance id is not a usable collection key', async () => {
    vi.mocked(axios.get).mockResolvedValue({
      status: 200,
      data: workflowsResponse,
    } as AxiosResponse);
    renderInstanceWorkflows(createQueryClientMock(), 'not-a-guid');

    expect(await screen.findByText(textMock('admin.workflows.no_results'))).toBeInTheDocument();
    const requestedUrls = vi.mocked(axios.get).mock.calls.map(([url]) => url as string);
    expect(requestedUrls.filter((url) => url.includes('/workflows/'))).toEqual([]);
  });

  it("names a transition's tasks by their names in the app's process", async () => {
    vi.mocked(axios.get).mockImplementation(
      async (url: string) =>
        ({
          status: 200,
          data: url.endsWith('/process-metadata')
            ? [
                { id: 'Pdf', name: 'PDF-generering', dataTypeTags: [] },
                { id: 'Sign', name: 'Signering', dataTypeTags: [] },
              ]
            : workflowsResponse,
        }) as AxiosResponse,
    );
    renderInstanceWorkflows();

    expect(await screen.findByText('PDF-generering → Signering')).toBeInTheDocument();
  });
});

const renderInstanceWorkflows = (
  client: QueryClient = createQueryClientMock(),
  id: string = instanceId,
) =>
  render(
    <MemoryRouter>
      <OrgContext.Provider value={orgMock}>
        <QueryClientProvider client={client}>
          <InstanceWorkflows org={org} environment={environment} app={app} instanceId={id} />
        </QueryClientProvider>
      </OrgContext.Provider>
    </MemoryRouter>,
  );
