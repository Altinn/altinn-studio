import React from 'react';

import { act, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { getInstanceWithProcessMock } from 'src/__mocks__/getInstanceDataMock';
import { ProcessWrapper } from 'src/components/wrappers/ProcessWrapper';
import { doProcessResume } from 'src/queries/queries';
import { renderWithInstanceAndLayout } from 'src/test/renderWithProviders';
import type { IInstanceWithProcess } from 'src/core/api-client/instance.api';
import type { IProcessWorkflow } from 'src/types/shared';

jest.mock('src/queries/queries', () => ({
  ...jest.requireActual<typeof import('src/queries/queries')>('src/queries/queries'),
  doProcessResume: jest.fn(),
}));

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
  beforeEach(() => {
    jest.mocked(doProcessResume).mockClear();
  });

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

  it('failed shows the generic localized message, suppresses the task, and Retry calls resume', async () => {
    const user = userEvent.setup();
    jest.mocked(doProcessResume).mockImplementation(async () => new Promise(() => {}));

    await renderProcessWrapper({
      status: 'failed',
      failure: { kind: 'StepFailed' },
    });

    // The citizen sees the localized generic message (the backend deliberately never ships raw
    // failure detail to the client - only the coarse `kind` classification).
    expect(screen.getByText(/noe gikk galt da skjemaet skulle behandles videre/i)).toBeInTheDocument();
    expect(screen.queryByTestId('task-content')).not.toBeInTheDocument();

    const retryButton = screen.getByRole('button', { name: /prøv igjen/i });
    expect(retryButton).toBeInTheDocument();

    await user.click(retryButton);

    await waitFor(() => {
      expect(doProcessResume).toHaveBeenCalledTimes(1);
    });
  });

  it('retry recovers the UI when another session already resumed the workflow', async () => {
    const user = userEvent.setup();
    // The resume mutation logs the failure for diagnostics before recovering; setupTests makes
    // window.logError throw, so stub it (and assert it fired).
    const logError = jest.spyOn(window, 'logError').mockImplementation(() => {});
    try {
      let resumedElsewhere = false;
      jest.mocked(doProcessResume).mockImplementation(async () => {
        // Simulate losing the race: another session already resumed the workflow, so this
        // session's resume conflicts — and by the time we refetch, the workflow has settled.
        resumedElsewhere = true;
        throw Object.assign(new Error('Request failed with status code 409'), {
          response: { status: 409, data: { title: 'Task does not need to be resumed.' } },
        });
      });

      await renderWithInstanceAndLayout({
        renderer: () => (
          <ProcessWrapper>
            <div data-testid='task-content'>Task content</div>
          </ProcessWrapper>
        ),
        apis: {
          instanceApi: {
            getInstance: async () =>
              getInstanceWithWorkflow(
                resumedElsewhere ? undefined : { status: 'failed', failure: { kind: 'StepFailed' } },
              ),
          },
        },
      });

      await user.click(screen.getByRole('button', { name: /prøv igjen/i }));

      // The failed resume refetches before complaining; the fresh status is no longer 'failed',
      // so the state machine recovers the task UI instead of stranding the session on a stale
      // failure screen with a misleading error toast.
      expect(await screen.findByTestId('task-content')).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /prøv igjen/i })).not.toBeInTheDocument();
      expect(logError).toHaveBeenCalled();
    } finally {
      logError.mockRestore();
    }
  });
});
