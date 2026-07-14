import React from 'react';
import type { createMemoryRouter } from 'react-router';

import { act, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { getInstanceWithProcessMock } from 'src/__mocks__/getInstanceDataMock';
import { ProcessWrapper } from 'src/components/wrappers/ProcessWrapper';
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

describe('ProcessWrapper workflow state machine', () => {
  it('idle renders the current task children', async () => {
    await renderProcessWrapper({ status: 'idle' });

    expect(screen.getByTestId('task-content')).toBeInTheDocument();
    expect(screen.queryByText(/vi behandler forespørselen din/i)).not.toBeInTheDocument();
  });

  it('renders children when no workflow annotation is present', async () => {
    await renderProcessWrapper(undefined);

    expect(screen.getByTestId('task-content')).toBeInTheDocument();
  });

  it('processing shows the spinner state and suppresses the task', async () => {
    // waitUntilLoaded is disabled because the blocking state intentionally renders a spinner.
    // targetTask is set but deliberately NOT rendered in the message (task ids aren't user-facing).
    await renderProcessWrapper({ status: 'processing', targetTask: 'Task_2' }, false);

    expect(await screen.findByText(/vi behandler forespørselen din/i)).toBeInTheDocument();
    expect(screen.getByText(/du trenger ikke gjøre noe/i)).toBeInTheDocument();
    expect(screen.queryByText(/task_2/i)).not.toBeInTheDocument();
    expect(screen.queryByTestId('task-content')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /send inn/i })).not.toBeInTheDocument();
  });

  it('processing shows "Steg x av y" when the target task is one of the process tasks - and omits it otherwise', async () => {
    // The step line resolves the target task's position among processTasks (BPMN document order).
    // A task -> end transition targets the end event, which is not a task, so the line is omitted
    // rather than rendering a lie.
    const withTwoTasks = (workflow: IProcessWorkflow) => {
      const instance = getInstanceWithWorkflow(workflow);
      instance.process.processTasks = [
        { altinnTaskType: 'data', elementId: 'Task_1' },
        { altinnTaskType: 'data', elementId: 'Task_2' },
      ];
      return instance;
    };

    const { unmount } = await renderWithInstanceAndLayout({
      renderer: () => <ProcessWrapper>{null}</ProcessWrapper>,
      waitUntilLoaded: false,
      apis: {
        instanceApi: { getInstance: async () => withTwoTasks({ status: 'processing', targetTask: 'Task_2' }) },
      },
    });
    expect(await screen.findByText('Steg 2 av 2')).toBeInTheDocument();
    unmount();

    await renderWithInstanceAndLayout({
      renderer: () => <ProcessWrapper>{null}</ProcessWrapper>,
      waitUntilLoaded: false,
      apis: {
        instanceApi: { getInstance: async () => withTwoTasks({ status: 'processing', targetTask: 'EndEvent_1' }) },
      },
    });
    expect(await screen.findByText(/vi behandler forespørselen din/i)).toBeInTheDocument();
    expect(screen.queryByText(/steg \d+ av \d+/i)).not.toBeInTheDocument();
  });

  it('processing escalates: taking-longer after 20s, then the safe-to-leave alert after 60s', async () => {
    // A transition can be stuck retrying server-side for hours; a bare spinner is infuriating at
    // that scale. After 20s we reassure; after 60s we level with the user - the data is durably
    // stored and the processing continues on its own, so the page can be closed.
    jest.useFakeTimers();
    try {
      await renderProcessWrapper({ status: 'processing', targetTask: 'Task_2' }, false);
      expect(await screen.findByText(/vi behandler forespørselen din/i)).toBeInTheDocument();
      expect(screen.queryByText(/dette tar litt lengre tid enn vanlig/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/du kan trygt lukke denne siden/i)).not.toBeInTheDocument();

      await act(async () => {
        await jest.advanceTimersByTimeAsync(25_000);
      });
      expect(screen.getByText(/dette tar litt lengre tid enn vanlig/i)).toBeInTheDocument();
      expect(screen.queryByText(/du kan trygt lukke denne siden/i)).not.toBeInTheDocument();

      await act(async () => {
        await jest.advanceTimersByTimeAsync(40_000);
      });
      expect(screen.getByText(/du kan trygt lukke denne siden/i)).toBeInTheDocument();
    } finally {
      jest.useRealTimers();
    }
  });

  it('processing explains an engine retry instead of the generic taking-longer note', async () => {
    // The backend flags a transition parked between automatic retry attempts. That explains the
    // wait more specifically than the time-based taking_longer note, so it replaces it - honestly
    // telling the user a step is being retried rather than leaving them guessing.
    jest.useFakeTimers();
    try {
      await renderProcessWrapper({ status: 'processing', targetTask: 'Task_2', retrying: true }, false);

      expect(await screen.findByText(/lyktes ikke på første forsøk/i)).toBeInTheDocument();

      await act(async () => {
        await jest.advanceTimersByTimeAsync(25_000);
      });
      expect(screen.getByText(/lyktes ikke på første forsøk/i)).toBeInTheDocument();
      expect(screen.queryByText(/dette tar litt lengre tid enn vanlig/i)).not.toBeInTheDocument();
    } finally {
      jest.useRealTimers();
    }
  });

  it('processing shows the connection-trouble note only after repeated poll failures', async () => {
    // A single swallowed poll blip stays invisible; from the second consecutive failed cycle the
    // advancing view honestly tells the user we're having trouble reaching the server (while
    // InstanceProvider keeps the view alive and the poll loop keeps retrying underneath).
    // Each failed poll cycle takes at most ~10s incl. the poll tick and the query's internal
    // retries/backoff, so advancing 12s completes exactly one cycle.
    jest.useFakeTimers();
    // Swallowed poll failures log a warning by design; setupTests makes window.log* throw.
    const logWarnOnce = jest.spyOn(window, 'logWarnOnce').mockImplementation(() => {});
    try {
      let failing = false;
      await renderWithInstanceAndLayout({
        renderer: () => <ProcessWrapper>{null}</ProcessWrapper>,
        waitUntilLoaded: false,
        apis: {
          instanceApi: {
            getInstance: async () => {
              if (failing) {
                throw new Error('poll failed');
              }
              return getInstanceWithWorkflow({ status: 'processing', targetTask: 'Task_2' });
            },
          },
        },
      });

      expect(await screen.findByText(/vi behandler forespørselen din/i)).toBeInTheDocument();
      failing = true;

      // Cycle 1: swallowed silently - no hint yet.
      await act(async () => {
        await jest.advanceTimersByTimeAsync(12_000);
      });
      expect(screen.queryByText(/problemer med å nå serveren/i)).not.toBeInTheDocument();

      // Cycle 2: the advancing view is still alive (below the escalation threshold) and now
      // carries the honest connection-trouble note.
      await act(async () => {
        await jest.advanceTimersByTimeAsync(12_000);
      });
      expect(screen.getByText(/vi behandler forespørselen din/i)).toBeInTheDocument();
      expect(screen.getByText(/problemer med å nå serveren/i)).toBeInTheDocument();
    } finally {
      jest.useRealTimers();
      logWarnOnce.mockRestore();
    }
  });

  it('processing does NOT replace the task in PDF mode', async () => {
    // The PDF service task renders the page while the transition is processing (by definition), so
    // the live-status replacement must not apply - it would swallow #readyForPrint and deadlock
    // the PDF generation the render is part of.
    await renderProcessWrapper({ status: 'processing', targetTask: 'Task_2' }, true, 'pdf=1');

    expect(screen.getByTestId('task-content')).toBeInTheDocument();
    expect(screen.queryByText(/vi behandler forespørselen din/i)).not.toBeInTheDocument();
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
    // with a contact-support pointer - deliberately NO Retry affordance. Recovery is ops-driven
    // and the failed-state slow poll converges the page (tested below).
    expect(screen.getByText(/noe gikk galt da skjemaet skulle behandles videre/i)).toBeInTheDocument();
    expect(screen.getByText(/brukerservice/i)).toBeInTheDocument();
    expect(screen.queryByTestId('task-content')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /prøv igjen/i })).not.toBeInTheDocument();

    // The details expander (the same widget the unknown-error page uses) exposes only safe
    // structured facts: localized failure kind, the failed step, when, and the support reference.
    // Raw error detail is never shipped by the backend, so it cannot appear here.
    await user.click(screen.getByRole('button', { name: 'Vis detaljer om feilen' }));
    expect(screen.getByText('Et behandlingssteg feilet')).toBeInTheDocument();
    expect(screen.getByText('Task_2')).toBeInTheDocument();
    expect(screen.getByText('0f1d5f88-1e5c-4c1f-9a25-4d9f66b6e5a1')).toBeInTheDocument();
  });

  it('failed renders the generic kind label for unknown failure kinds', async () => {
    await renderProcessWrapper({
      status: 'failed',
      failure: { kind: 'somethingNewTheBackendInvented' },
    });

    // An unknown/new kind must fall back to the generic label, never render a raw lang key.
    expect(screen.getByText('Ukjent feil')).toBeInTheDocument();
    expect(screen.queryByText(/process_workflow\.failure_kind/)).not.toBeInTheDocument();
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
    jest.useFakeTimers();
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

      expect(await screen.findByText(/vi behandler forespørselen din/i)).toBeInTheDocument();

      // The transition commits out-of-band (this session never called process/next).
      committed = true;

      // One processing-state poll window always contains at least one tick; add slack for the
      // navigation + the wrong-task check's own settle delay.
      await act(async () => {
        await jest.advanceTimersByTimeAsync(13_000);
      });

      // The URL converged onto the committed task, and the stale-task navigation error never showed.
      expect(routerRef.current!.state.location.pathname).toContain('/Task_2');
      expect(screen.queryByText(/denne delen av skjemaet er ikke tilgjengelig/i)).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /gå til riktig prosessteg/i })).not.toBeInTheDocument();
    } finally {
      jest.useRealTimers();
    }
  });

  it('failed auto-recovers when ops resumes the workflow out-of-band', async () => {
    // There is no Retry affordance; recovery is ops-driven. The failed state keeps polling slowly
    // (~10-12s jittered), so once an ops resume settles the workflow, the next poll converges the
    // page back to the task on its own - no reload needed.
    jest.useFakeTimers();
    try {
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
            getInstance: async () =>
              getInstanceWithWorkflow(resumedByOps ? undefined : { status: 'failed', failure: { kind: 'stepFailed' } }),
          },
        },
      });

      expect(await screen.findByText(/noe gikk galt da skjemaet skulle behandles videre/i)).toBeInTheDocument();

      resumedByOps = true;

      // One failed-state poll window (max 12s jitter) always contains at least one tick.
      await act(async () => {
        await jest.advanceTimersByTimeAsync(13_000);
      });

      expect(screen.getByTestId('task-content')).toBeInTheDocument();
      expect(screen.queryByText(/noe gikk galt da skjemaet skulle behandles videre/i)).not.toBeInTheDocument();
    } finally {
      jest.useRealTimers();
    }
  });
});
