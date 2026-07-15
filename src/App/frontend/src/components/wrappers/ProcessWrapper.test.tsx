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

  it('processing shows "Steg x av y" from the transition step progress - and omits it when unreported', async () => {
    // The step line is progress through the transition's engine steps: 7 of 12 completed means
    // execution is on step 8. An older engine reports no counts, so the line is simply omitted.
    const { unmount } = await renderProcessWrapper(
      { status: 'processing', targetTask: 'Task_2', progress: { completed: 7, total: 12 } },
      false,
    );
    expect(await screen.findByText('Steg 8 av 12')).toBeInTheDocument();
    unmount();

    await renderProcessWrapper({ status: 'processing', targetTask: 'Task_2' }, false);
    expect(await screen.findByText(/vi behandler forespørselen din/i)).toBeInTheDocument();
    expect(screen.queryByText(/steg \d+ av \d+/i)).not.toBeInTheDocument();
  });

  it('processing caps the step indicator at the total while the last step finishes', async () => {
    // completed === total happens in the window where the last step is done but the workflow
    // status hasn't settled yet - the indicator must not overshoot to "Steg 13 av 12".
    await renderProcessWrapper(
      { status: 'processing', targetTask: 'Task_2', progress: { completed: 12, total: 12 } },
      false,
    );
    expect(await screen.findByText('Steg 12 av 12')).toBeInTheDocument();
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
    // and the page is static: no polling (tested below), a manual refresh picks up the recovery.
    expect(screen.getByText(/noe gikk galt da skjemaet skulle behandles videre/i)).toBeInTheDocument();
    expect(screen.getByText(/brukerservice/i)).toBeInTheDocument();
    expect(screen.queryByTestId('task-content')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /prøv igjen/i })).not.toBeInTheDocument();

    // The details expander (the same widget the unknown-error page uses) exposes only safe
    // structured facts: localized failure kind, when, and the support reference. Raw error detail
    // is never shipped by the backend, so it cannot appear here - and step/task identities are
    // deliberately omitted too (internal ids; the target task's type label was just misleading).
    await user.click(screen.getByRole('button', { name: 'Vis detaljer om feilen' }));
    expect(screen.getByText('Et behandlingssteg feilet')).toBeInTheDocument();
    expect(screen.getByText('0f1d5f88-1e5c-4c1f-9a25-4d9f66b6e5a1')).toBeInTheDocument();
    expect(screen.queryByText('Task_2')).not.toBeInTheDocument();
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

  it('failed is static: no polling, so recovery requires a manual refresh', async () => {
    // There is no Retry affordance and no poll: a terminal failure requires manual (ops)
    // intervention either way, so the error page stays put (and an open tab stops paying the
    // expensive failed-path engine reads). Even after an out-of-band ops resume settles the
    // workflow, this page only converges on a manual refresh.
    jest.useFakeTimers();
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

      expect(await screen.findByText(/noe gikk galt da skjemaet skulle behandles videre/i)).toBeInTheDocument();
      const fetchesAfterLoad = fetchCount;

      resumedByOps = true;

      // Well past both the processing (~2-3s) and the old failed (~10-12s) poll windows: no ticks,
      // so the settled workflow is never observed and the error page deliberately stays.
      await act(async () => {
        await jest.advanceTimersByTimeAsync(60_000);
      });

      expect(fetchCount).toBe(fetchesAfterLoad);
      expect(screen.getByText(/noe gikk galt da skjemaet skulle behandles videre/i)).toBeInTheDocument();
      expect(screen.queryByTestId('task-content')).not.toBeInTheDocument();
    } finally {
      jest.useRealTimers();
    }
  });
});
