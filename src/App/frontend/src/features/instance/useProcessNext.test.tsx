import React from 'react';

import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { getInstanceWithProcessMock } from 'src/__mocks__/getInstanceDataMock';
import { ProcessWrapper } from 'src/components/wrappers/ProcessWrapper';
import { useProcessNextOutsideFormProvider } from 'src/features/instance/useProcessNext';
import { doProcessNext } from 'src/queries/queries';
import { renderWithInstanceAndLayout } from 'src/test/renderWithProviders';
import type { IInstanceWithProcess } from 'src/core/api-client/instance.api';
import type { IProcessWorkflow } from 'src/types/shared';

jest.mock('src/queries/queries', () => ({
  ...jest.requireActual<typeof import('src/queries/queries')>('src/queries/queries'),
  doProcessNext: jest.fn(),
}));

function getInstanceWithWorkflow(workflow?: IProcessWorkflow): IInstanceWithProcess {
  const instance = getInstanceWithProcessMock();
  instance.process.workflow = workflow;
  return instance;
}

function SubmitProbe() {
  const processNext = useProcessNextOutsideFormProvider();
  return (
    <button
      type='button'
      onClick={() => processNext.mutate()}
    >
      submit-probe
    </button>
  );
}

function createAxiosLikeError(status: number, data: Record<string, unknown>) {
  return Object.assign(new Error(`Request failed with status code ${status}`), {
    response: { status, data },
  });
}

/**
 * Renders a task (with a submit probe) whose process/next call fails with the given error body;
 * after the failure the instance refetch reports the given live workflow annotation. Because
 * setupTests makes window.logError throw, these tests also prove the mutation's error path is NOT
 * taken — the error body is consumed by the state machine instead of being logged and toasted
 * (which used to surface the backend's raw failure detail to the citizen).
 */
async function renderFailingProcessNext(errorBody: Record<string, unknown>, status: number, after?: IProcessWorkflow) {
  let transitionAttempted = false;
  jest.mocked(doProcessNext).mockImplementation(async () => {
    transitionAttempted = true;
    throw createAxiosLikeError(status, errorBody);
  });

  await renderWithInstanceAndLayout({
    renderer: () => (
      <ProcessWrapper>
        <SubmitProbe />
      </ProcessWrapper>
    ),
    apis: {
      instanceApi: {
        getInstance: async () => getInstanceWithWorkflow(transitionAttempted ? after : undefined),
      },
    },
  });
}

describe('useProcessNext workflow error convergence', () => {
  beforeEach(() => {
    jest.mocked(doProcessNext).mockReset();
  });

  it('a 500 with workflowFailure is swallowed and converges on the failed screen', async () => {
    const user = userEvent.setup();
    await renderFailingProcessNext(
      {
        title: 'Something went wrong while moving to the next task.',
        detail: 'A workflow step failed while performing the process action.',
        workflowFailure: { kind: 'stepFailed', retryAction: 'resumeWorkflow' },
        processStateChanged: false,
      },
      500,
      { status: 'failed', targetTask: 'Task_2', failure: { kind: 'stepFailed' } },
    );

    await user.click(screen.getByRole('button', { name: 'submit-probe' }));

    // The refetched workflow.status takes over: the citizen sees the localized failed error page
    // (with the safe details expander) — not an error toast echoing the backend's detail, and no
    // Retry affordance (the engine already exhausted its retry budget; recovery is ops-driven).
    expect(await screen.findByRole('heading', { name: /noe gikk galt/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Vis detaljer om feilen' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /prøv igjen/i })).not.toBeInTheDocument();
    expect(doProcessNext).toHaveBeenCalledTimes(1);
  });

  it('a 504 timeout with workflowFailure is swallowed and converges on the advancing screen', async () => {
    const user = userEvent.setup();
    await renderFailingProcessNext(
      {
        title: 'Something went wrong while moving to the next task.',
        detail: 'Timeout while waiting for workflows to complete.',
        workflowFailure: { kind: 'timeout' },
      },
      504,
      { status: 'processing', targetTask: 'Task_2' },
    );

    await user.click(screen.getByRole('button', { name: 'submit-probe' }));

    // The engine keeps working after the synchronous wait timed out: the polled processing state
    // replaces the task instead of a scary error.
    expect(await screen.findByText(/vi behandler forespørselen din/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /prøv igjen/i })).not.toBeInTheDocument();
  });

  it('a blocked 409 with processNextState=retrying is swallowed and converges on the advancing screen', async () => {
    const user = userEvent.setup();
    await renderFailingProcessNext(
      {
        title: 'Task is still being processed.',
        processNextState: 'retrying',
        validationIssues: null,
      },
      409,
      { status: 'processing', targetTask: 'Task_2' },
    );

    await user.click(screen.getByRole('button', { name: 'submit-probe' }));

    expect(await screen.findByText(/vi behandler forespørselen din/i)).toBeInTheDocument();
  });
});
