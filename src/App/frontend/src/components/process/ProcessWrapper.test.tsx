import React from 'react';
import type { createMemoryRouter } from 'react-router';

import { act, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { getInstanceWithProcessMock } from 'src/__mocks__/getInstanceDataMock';
import { ProcessWrapper } from 'src/components/process/ProcessWrapper';
import { InstanceProvider } from 'src/features/instance/InstanceContext';
import { InstanceRouter, renderWithDefaultProviders, renderWithInstanceAndLayout } from 'src/test/renderWithProviders';
import type { IInstanceWithProcess } from 'src/core/api-client/instance.api';
import type { IProcessWorkflow } from 'src/types/shared';

type RouterRef = { current: ReturnType<typeof createMemoryRouter> | undefined };

function getInstanceWithWorkflow(workflow?: IProcessWorkflow): IInstanceWithProcess {
  const instance = getInstanceWithProcessMock();
  instance.process.workflow = workflow;
  return instance;
}

async function renderProcessWrapper(workflow?: IProcessWorkflow, waitUntilLoaded = true, query?: string) {
  return renderWithInstanceAndLayout({
    renderer: () => (
      <ProcessWrapper>
        <div data-testid='task-content'>Task content</div>
      </ProcessWrapper>
    ),
    waitUntilLoaded,
    query,
    apis: {
      instanceApi: {
        getInstance: async () => getInstanceWithWorkflow(workflow),
      },
    },
  });
}

async function expectWorkflowLoader() {
  await waitFor(() => expect(screen.getByTestId('loader')).toHaveAttribute('data-reason', 'workflow-processing'));
}

describe('ProcessWrapper workflow state machine', () => {
  it('idle renders the current task children', async () => {
    await renderProcessWrapper({ status: 'idle' });

    expect(screen.getByTestId('task-content')).toBeInTheDocument();
    expect(screen.queryByTestId('loader')).not.toBeInTheDocument();
  });

  it('renders children when no workflow annotation is present', async () => {
    await renderProcessWrapper(undefined);

    expect(screen.getByTestId('task-content')).toBeInTheDocument();
  });

  it('idle-parked service task without a layout renders the waiting view, not the failure screen', async () => {
    // The process is parked on a service task pending an outcome (e.g. an external callback), and
    // nothing has failed. Before #18935 this rendered the failure-styled retry/back screen; now it
    // is an implicit waiting step: spinner + reassurance, no recovery buttons, polling underneath.
    const instance = getInstanceWithProcessMock();
    instance.process.currentTask = {
      ...instance.process.currentTask!,
      elementId: 'Task_Service',
      elementType: 'ServiceTask',
      altinnTaskType: 'scenario',
    };
    instance.process.processTasks = [{ elementId: 'Task_Service', altinnTaskType: 'scenario' }];
    instance.process.workflow = { status: 'idle' };

    await renderWithInstanceAndLayout({
      renderer: () => (
        <ProcessWrapper>
          <div data-testid='task-content'>Task content</div>
        </ProcessWrapper>
      ),
      taskId: 'Task_Service',
      apis: {
        instanceApi: {
          getInstance: async () => instance,
        },
      },
    });

    expect(await screen.findByText(/vi behandler forespørselen din/i)).toBeInTheDocument();
    expect(screen.getByText(/du trenger ikke å gjøre noe/i)).toBeInTheDocument();
    expect(screen.queryByTestId('task-content')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /prøv igjen/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /gå tilbake/i })).not.toBeInTheDocument();
    expect(screen.queryByText(/noe gikk galt/i)).not.toBeInTheDocument();
  });

  it('idle-parked service task WITH a layout renders the layout - a custom layout opts out of the default waiting view', async () => {
    // The harness registers a layout for the mock task, so classifying it as Data and rendering
    // its children is the layout-wins path. Failure still takes precedence (tested below); the
    // parked-follow polling applies to both variants and is covered by the e2e suite.
    const instance = getInstanceWithProcessMock();
    instance.process.currentTask!.elementType = 'ServiceTask';
    instance.process.workflow = { status: 'idle' };

    await renderWithInstanceAndLayout({
      renderer: () => (
        <ProcessWrapper>
          <div data-testid='task-content'>Task content</div>
        </ProcessWrapper>
      ),
      apis: {
        instanceApi: {
          getInstance: async () => instance,
        },
      },
    });

    expect(await screen.findByTestId('task-content')).toBeInTheDocument();
    expect(screen.queryByText(/vi behandler forespørselen din/i)).not.toBeInTheDocument();
  });

  it('processing shows the standard loader and suppresses the task', async () => {
    // waitUntilLoaded is disabled because the blocking state intentionally renders a loader.
    await renderProcessWrapper({ status: 'processing', targetTask: 'Task_2' }, false);

    await expectWorkflowLoader();
    expect(screen.getByRole('heading', { name: /vent litt, vi henter det du trenger/i })).toBeInTheDocument();
    expect(screen.queryByText(/du kan trygt lukke siden/i)).not.toBeInTheDocument();
    expect(screen.queryByTestId('task-content')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /send inn/i })).not.toBeInTheDocument();
  });

  it('processing parked ON a layouted service task renders the layout - park and defer are identical UX', async () => {
    // A deferring service task reports processing while the process sits on the committed task
    // (targetTask === currentTask). With a custom layout, the app's page renders exactly as it
    // does for a parked (idle) task: park and defer are deliberately identical UX on layouted tasks.
    const instance = getInstanceWithProcessMock();
    instance.process.currentTask!.elementType = 'ServiceTask';
    instance.process.workflow = {
      status: 'processing',
      targetTask: instance.process.currentTask!.elementId,
    };

    await renderWithInstanceAndLayout({
      renderer: () => (
        <ProcessWrapper>
          <div data-testid='task-content'>Task content</div>
        </ProcessWrapper>
      ),
      apis: {
        instanceApi: {
          getInstance: async () => instance,
        },
      },
    });

    expect(await screen.findByTestId('task-content')).toBeInTheDocument();
    expect(screen.queryByTestId('loader')).not.toBeInTheDocument();
    expect(screen.queryByText(/vi behandler forespørselen din/i)).not.toBeInTheDocument();
  });

  it('processing FROM a layouted service task toward another task shows the loader', async () => {
    // Once the deferring task resolves and auto-advances, the dependent transition targets the
    // next task: the process is in flight AWAY from the service task, so its layout no longer
    // owns the presentation and the loader takes over until the transition settles.
    const instance = getInstanceWithProcessMock();
    instance.process.currentTask!.elementType = 'ServiceTask';
    instance.process.workflow = { status: 'processing', targetTask: 'Task_Somewhere_Else' };

    await renderWithInstanceAndLayout({
      renderer: () => (
        <ProcessWrapper>
          <div data-testid='task-content'>Task content</div>
        </ProcessWrapper>
      ),
      waitUntilLoaded: false,
      apis: {
        instanceApi: {
          getInstance: async () => instance,
        },
      },
    });

    await expectWorkflowLoader();
    expect(screen.queryByTestId('task-content')).not.toBeInTheDocument();
  });

  it('processing parked ON a service task WITHOUT a layout shows the loader', async () => {
    // The layout is the app's opt-in to owning this state. Without one, a deferring task shows
    // the standard loader (pinned by the e2e suite), not the parked waiting view, which
    // is reserved for a task that has succeeded and idles awaiting an external release.
    const instance = getInstanceWithProcessMock();
    instance.process.currentTask = {
      ...instance.process.currentTask!,
      elementId: 'Task_Service',
      elementType: 'ServiceTask',
      altinnTaskType: 'scenario',
    };
    instance.process.processTasks = [{ elementId: 'Task_Service', altinnTaskType: 'scenario' }];
    instance.process.workflow = { status: 'processing', targetTask: 'Task_Service' };

    await renderWithInstanceAndLayout({
      renderer: () => (
        <ProcessWrapper>
          <div data-testid='task-content'>Task content</div>
        </ProcessWrapper>
      ),
      waitUntilLoaded: false,
      taskId: 'Task_Service',
      apis: {
        instanceApi: {
          getInstance: async () => instance,
        },
      },
    });

    await expectWorkflowLoader();
    expect(screen.queryByText(/vi behandler forespørselen din/i)).not.toBeInTheDocument();
    expect(screen.queryByTestId('task-content')).not.toBeInTheDocument();
  });

  it('processing never renders the wire-model step progress - engine step counts are not user-facing', async () => {
    await renderProcessWrapper(
      { status: 'processing', targetTask: 'Task_2', progress: { completed: 7, total: 12 } },
      false,
    );
    await expectWorkflowLoader();
    expect(screen.queryByText(/steg \d+ av \d+/i)).not.toBeInTheDocument();
  });

  it('processing shows the safe-to-leave alert after five seconds', async () => {
    // Keep the initial state quiet, then explain what the user can do once a bare loader has lasted
    // long enough to need context.
    // No startedAt here (older backend), so the wait falls back to being measured from mount.
    vi.useFakeTimers();
    try {
      await renderProcessWrapper({ status: 'processing', targetTask: 'Task_2' }, false);
      await expectWorkflowLoader();
      expect(screen.queryByText(/du kan trygt lukke siden/i)).not.toBeInTheDocument();

      await act(async () => {
        await vi.advanceTimersByTimeAsync(4_000);
      });
      expect(screen.queryByText(/du kan trygt lukke siden/i)).not.toBeInTheDocument();

      await act(async () => {
        await vi.advanceTimersByTimeAsync(2_000);
      });
      const status = screen.getByRole('status');
      expect(status).toHaveAttribute('aria-live', 'polite');
      expect(status).toHaveAttribute('aria-atomic', 'true');
      expect(status).toHaveTextContent(/du kan trygt lukke siden/i);
      expect(status.parentElement).toContainElement(screen.getByTestId('loader'));
    } finally {
      vi.useRealTimers();
    }
  });

  it('processing anchors the escalation to the server-reported transition start, not the page load', async () => {
    // A page refresh or a second session reconnecting mid-transition must not restart the clock:
    // when startedAt says the transition has already been running past the threshold, the
    // safe-to-leave alert shows immediately instead of after another full local wait.
    vi.useFakeTimers();
    try {
      await renderProcessWrapper(
        {
          status: 'processing',
          targetTask: 'Task_2',
          startedAt: new Date(Date.now() - 10 * 60_000).toISOString(),
        },
        false,
      );
      await expectWorkflowLoader();

      await act(async () => {
        await vi.advanceTimersByTimeAsync(0);
      });
      expect(screen.getByText(/du kan trygt lukke siden/i)).toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });

  it('processing subtracts the already-elapsed server-side wait from the escalation threshold', async () => {
    // Reconnecting three seconds into the transition leaves two seconds of the five-second threshold: still quiet just
    // before that remainder elapses, escalated just after.
    vi.useFakeTimers();
    try {
      await renderProcessWrapper(
        {
          status: 'processing',
          targetTask: 'Task_2',
          startedAt: new Date(Date.now() - 3_000).toISOString(),
        },
        false,
      );
      await expectWorkflowLoader();

      await act(async () => {
        await vi.advanceTimersByTimeAsync(1_000);
      });
      expect(screen.queryByText(/du kan trygt lukke siden/i)).not.toBeInTheDocument();

      await act(async () => {
        await vi.advanceTimersByTimeAsync(2_000);
      });
      expect(screen.getByText(/du kan trygt lukke siden/i)).toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });

  it('processing does NOT replace the task in PDF mode', async () => {
    // The PDF service task renders the page while the transition is processing (by definition), so
    // the live-status replacement must not apply - it would swallow #readyForPrint and deadlock
    // the PDF generation the render is part of.
    await renderProcessWrapper({ status: 'processing', targetTask: 'Task_2' }, true, 'pdf=1');

    expect(screen.getByTestId('task-content')).toBeInTheDocument();
    expect(screen.queryByTestId('loader')).not.toBeInTheDocument();
  });

  it('failed shows the error page with support info and safe structured details - and no Retry', async () => {
    const user = userEvent.setup();

    await renderProcessWrapper({
      status: 'failed',
      targetTask: 'Task_2',
      failure: {
        kind: 'stepFailed',
        workflowId: '0f1d5f88-1e5c-4c1f-9a25-4d9f66b6e5a1',
        occurredAt: '2026-07-10T11:22:33Z',
      },
    });

    // The engine already exhausted its automatic retry budget, so the citizen gets an error page
    // that levels with them: the processing failed and won't self-resolve, so contact support -
    // deliberately NO Retry affordance and NO false "we've got it" reassurance. Recovery is
    // ops-driven and the page is static: no polling (tested below), a manual refresh picks it up.
    expect(screen.getByText(/vi klarte ikke å fullføre behandlingen av skjemaet/i)).toBeInTheDocument();
    expect(screen.getByText(/brukerservice/i)).toBeInTheDocument();
    // Both phone and email contact routes are offered (email is a nested Lang param, so it matches
    // its own element plus the enclosing paragraph - assert presence, not a single match).
    expect(screen.getAllByText(/servicedesk@altinn\.no/i).length).toBeGreaterThan(0);
    expect(screen.queryByTestId('task-content')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /prøv igjen/i })).not.toBeInTheDocument();

    // The details expander (the same widget the unknown-error page uses) exposes only safe
    // structured facts: localized failure kind, when, and the two references the user relays to
    // support (the form/instance id and the workflow id). Raw error detail is never shipped by the
    // backend, so it cannot appear here - and step/task identities are deliberately omitted too
    // (internal ids; the target task's type label was just misleading).
    await user.click(screen.getByText('Vis detaljer om feilen').closest('summary')!);
    expect(screen.getByText('Et steg i behandlingen feilet')).toBeInTheDocument();
    expect(screen.getByText('Skjemareferanse')).toBeInTheDocument();
    expect(screen.getByText('0f1d5f88-1e5c-4c1f-9a25-4d9f66b6e5a1')).toBeInTheDocument();
    expect(screen.queryByText('Task_2')).not.toBeInTheDocument();
  });

  it('failed renders the generic kind label for unknown failure kinds', async () => {
    await renderProcessWrapper({
      status: 'failed',
      failure: { kind: 'somethingNewTheBackendInvented' },
    });

    // An unknown/new kind must fall back to the generic label, never render a raw lang key.
    expect(screen.getByText('Ukjent årsak')).toBeInTheDocument();
    expect(screen.queryByText(/process_workflow\.failure_kind/)).not.toBeInTheDocument();
  });

  it('failed on the current service task renders the recoverable failure view, even over a custom layout', async () => {
    // A failed workflow that targeted the CURRENT task, when that task is a service task, is owned
    // by that task and renders ServiceTaskFailed (retry via process/resume) instead of the
    // terminal error page - the terminal page is only for failures no task UI can recover from
    // (e.g. the pre-commit failure above, which targets ANOTHER task).
    // The harness registers a layout for the task, so this also pins failure-over-layout
    // precedence: a custom layout would classify the task as Data and silently render its form
    // with no trace of the failure, so the failure view must win (#18935).
    const instance = getInstanceWithProcessMock();
    instance.process.currentTask!.elementType = 'ServiceTask';
    instance.process.currentTask!.userActions = [{ id: 'write', authorized: true, type: 'ProcessAction' }];
    instance.process.workflow = { status: 'failed', targetTask: 'Task_1', failure: { kind: 'stepFailed' } };

    await renderWithInstanceAndLayout({
      renderer: () => (
        <ProcessWrapper>
          <div data-testid='task-content'>Task content</div>
        </ProcessWrapper>
      ),
      apis: {
        instanceApi: {
          getInstance: async () => instance,
        },
      },
    });

    expect(await screen.findByRole('button', { name: /prøv igjen/i })).toBeInTheDocument();
    expect(screen.queryByTestId('task-content')).not.toBeInTheDocument();
    expect(screen.queryByText(/vi klarte ikke å fullføre behandlingen av skjemaet/i)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Vis detaljer om feilen' })).not.toBeInTheDocument();
  });

  it('navigates to the committed task when the workflow settles while parked on the old task url', async () => {
    // A reload during a transition parks the session on the pre-transition task's URL (the
    // same-session flow instead navigates from useProcessNext's onSuccess). When the poll then
    // observes the settled workflow - currentTask advanced to Task_2, status idle - the page must
    // navigate onto the committed task, not strand the user on Task_1's "not available" error.
    //
    // Rendered with the production provider order (InstanceProvider > ProcessWrapper, FormProvider
    // below) rather than renderWithInstanceAndLayout, whose inverted order unmounts ProcessWrapper
    // into a layout loader as soon as currentTask changes.
    vi.useFakeTimers();
    try {
      let committed = false;
      const routerRef: RouterRef = { current: undefined };
      await renderWithDefaultProviders({
        renderer: () => (
          <InstanceProvider>
            <ProcessWrapper>
              <div data-testid='task-content'>Task content</div>
            </ProcessWrapper>
          </InstanceProvider>
        ),
        router: ({ children }) => <InstanceRouter routerRef={routerRef}>{children}</InstanceRouter>,
        waitUntilLoaded: false,
        apis: {
          instanceApi: {
            getInstance: async () => {
              const instance = getInstanceWithProcessMock();
              instance.process.processTasks = [
                { altinnTaskType: 'data', elementId: 'Task_1' },
                { altinnTaskType: 'data', elementId: 'Task_2' },
              ];
              if (committed) {
                instance.process.currentTask!.elementId = 'Task_2';
                instance.process.currentTask!.name = 'Task_2';
                instance.process.workflow = { status: 'idle' };
              } else {
                instance.process.workflow = { status: 'processing', targetTask: 'Task_2' };
              }
              return instance;
            },
          },
        },
      });

      await expectWorkflowLoader();

      // The transition commits out-of-band (this session never called process/next).
      committed = true;

      // One processing-state poll window always contains at least one tick; add slack for the
      // navigation + the wrong-task check's own settle delay.
      await act(async () => {
        await vi.advanceTimersByTimeAsync(13_000);
      });

      // The URL converged onto the committed task, and the stale-task navigation error never showed.
      expect(routerRef.current!.state.location.pathname).toContain('/Task_2');
      expect(screen.queryByText(/denne delen av skjemaet er ikke tilgjengelig/i)).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /gå til riktig prosessteg/i })).not.toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });

  it('failed is static: no polling, so recovery requires a manual refresh', async () => {
    // There is no Retry affordance and no poll: a terminal failure requires manual (ops)
    // intervention either way, so the error page stays put (and an open tab stops paying the
    // expensive failed-path engine reads). Even after an out-of-band ops resume settles the
    // workflow, this page only converges on a manual refresh.
    vi.useFakeTimers();
    try {
      let fetchCount = 0;
      let resumedByOps = false;
      await renderWithInstanceAndLayout({
        renderer: () => (
          <ProcessWrapper>
            <div data-testid='task-content'>Task content</div>
          </ProcessWrapper>
        ),
        waitUntilLoaded: false,
        apis: {
          instanceApi: {
            getInstance: async () => {
              fetchCount++;
              return getInstanceWithWorkflow(
                resumedByOps ? undefined : { status: 'failed', failure: { kind: 'stepFailed' } },
              );
            },
          },
        },
      });

      expect(await screen.findByText(/vi klarte ikke å fullføre behandlingen av skjemaet/i)).toBeInTheDocument();
      const fetchesAfterLoad = fetchCount;

      resumedByOps = true;

      // Well past any active polling interval: no ticks,
      // so the settled workflow is never observed and the error page deliberately stays.
      await act(async () => {
        await vi.advanceTimersByTimeAsync(60_000);
      });

      expect(fetchCount).toBe(fetchesAfterLoad);
      expect(screen.getByText(/vi klarte ikke å fullføre behandlingen av skjemaet/i)).toBeInTheDocument();
      expect(screen.queryByTestId('task-content')).not.toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });
});
