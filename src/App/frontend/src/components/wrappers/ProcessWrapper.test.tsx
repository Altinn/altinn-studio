import React from 'react';

import { act, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { getInstanceWithProcessMock } from 'src/__mocks__/getInstanceDataMock';
import { ProcessWrapper } from 'src/components/wrappers/ProcessWrapper';
import { renderWithInstanceAndLayout } from 'src/test/renderWithProviders';
import type { IInstanceWithProcess } from 'src/core/api-client/instance.api';
import type { IProcessWorkflow } from 'src/types/shared';

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
    expect(screen.queryByText(/går videre til/i)).not.toBeInTheDocument();
  });

  it('renders children when no workflow annotation is present', async () => {
    await renderProcessWrapper(undefined);

    expect(screen.getByTestId('task-content')).toBeInTheDocument();
  });

  it('processing shows the advancing state and suppresses the task', async () => {
    // waitUntilLoaded is disabled because the blocking state intentionally renders a <Loader />
    // targetTask is set but deliberately NOT rendered in the message (task ids aren't user-facing).
    await renderProcessWrapper({ status: 'processing', targetTask: 'Task_2' }, false);

    expect(await screen.findByText(/går videre til neste steg/i)).toBeInTheDocument();
    expect(screen.queryByText(/task_2/i)).not.toBeInTheDocument();
    expect(screen.queryByTestId('task-content')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /send inn/i })).not.toBeInTheDocument();
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

      expect(await screen.findByText(/går videre til neste steg/i)).toBeInTheDocument();
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
      expect(screen.getByText(/går videre til neste steg/i)).toBeInTheDocument();
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
    expect(screen.queryByText(/går videre til neste steg/i)).not.toBeInTheDocument();
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
