import React from 'react';
import { toast } from 'react-toastify';
import type { createMemoryRouter } from 'react-router';

import { act, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AxiosHeaders } from 'axios';

import { getInstanceWithProcessMock } from 'src/__mocks__/getInstanceDataMock';
import { ProcessWrapper } from 'src/components/process/ProcessWrapper';
import { InstanceProvider } from 'src/features/instance/InstanceContext';
import { useProcessNextOutsideFormProvider } from 'src/features/instance/useProcessNext';
import { doProcessNext } from 'src/queries/queries';
import { InstanceRouter, renderWithDefaultProviders, renderWithInstanceAndLayout } from 'src/test/renderWithProviders';
import type { IInstanceWithProcess } from 'src/core/api-client/instance.api';
import type { IProcessWorkflow } from 'src/types/shared';

vi.mock('react-toastify', async () => {
  const actual = await vi.importActual<typeof import('react-toastify')>('react-toastify');
  return { ...actual, toast: Object.assign(vi.fn(), actual.toast) };
});

vi.mock('src/queries/queries', async () => ({
  ...(await vi.importActual<typeof import('src/queries/queries')>('src/queries/queries')),
  doProcessNext: vi.fn(),
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
async function renderFailingProcessNext(
  errorBody: Record<string, unknown>,
  status: number,
  after?: IProcessWorkflow,
  query?: string,
) {
  let transitionAttempted = false;
  vi.mocked(doProcessNext).mockImplementation(async () => {
    transitionAttempted = true;
    throw createAxiosLikeError(status, errorBody);
  });

  await renderWithInstanceAndLayout({
    renderer: () => (
      <ProcessWrapper>
        <SubmitProbe />
      </ProcessWrapper>
    ),
    query,
    apis: {
      instanceApi: {
        getInstance: async () => getInstanceWithWorkflow(transitionAttempted ? after : undefined),
      },
    },
  });
}

describe('useProcessNext workflow error convergence', () => {
  beforeEach(() => {
    vi.mocked(doProcessNext).mockReset();
    vi.mocked(toast).mockClear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
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
    expect(screen.getByText('Vis detaljer om feilen').closest('summary')).toBeInTheDocument();
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
    await waitFor(() => expect(screen.getByTestId('loader')).toHaveAttribute('data-reason', 'workflow-processing'));
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

    await waitFor(() => expect(screen.getByTestId('loader')).toHaveAttribute('data-reason', 'workflow-processing'));
  });

  it('a bodiless timeout uses the refetched processing state instead of showing a toast', async () => {
    const logError = vi.spyOn(window, 'logError').mockImplementation(() => {});
    const user = userEvent.setup();
    await renderFailingProcessNext({}, 504, { status: 'processing', targetTask: 'Task_2' });

    await user.click(screen.getByRole('button', { name: 'submit-probe' }));

    await waitFor(() => expect(screen.getByTestId('loader')).toHaveAttribute('data-reason', 'workflow-processing'));
    expect(logError).toHaveBeenCalledTimes(1);
    expect(toast).not.toHaveBeenCalled();
  });

  it('keeps the timeout toast in PDF mode where processing does not replace the form', async () => {
    const logError = vi.spyOn(window, 'logError').mockImplementation(() => {});
    const user = userEvent.setup();
    await renderFailingProcessNext({}, 504, { status: 'processing', targetTask: 'Task_2' }, 'pdf=1');

    await user.click(screen.getByRole('button', { name: 'submit-probe' }));

    await waitFor(() => expect(toast).toHaveBeenCalledTimes(1));
    expect(logError).toHaveBeenCalledTimes(1);
    expect(screen.queryByTestId('loader')).not.toBeInTheDocument();
  });
});

type RouterRef = { current: ReturnType<typeof createMemoryRouter> | undefined };
type ProcessNextResponse = Awaited<ReturnType<typeof doProcessNext>>;

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

function getSettledOnTask2(): IInstanceWithProcess {
  const instance = getInstanceWithProcessMock();
  instance.process.processTasks = [
    { altinnTaskType: 'data', elementId: 'Task_1' },
    { altinnTaskType: 'data', elementId: 'Task_2' },
  ];
  instance.process.currentTask!.elementId = 'Task_2';
  instance.process.currentTask!.name = 'Task_2';
  instance.process.workflow = { status: 'idle' };
  return instance;
}

function processNextResponse(data: IInstanceWithProcess): ProcessNextResponse {
  return {
    data,
    status: 200,
    statusText: 'OK',
    headers: new AxiosHeaders(),
    config: { headers: new AxiosHeaders() },
  };
}

async function renderPendingProcessNext() {
  const pending = deferred<ProcessNextResponse>();
  let requestStarted = false;
  vi.mocked(doProcessNext).mockImplementation(() => {
    requestStarted = true;
    return pending.promise;
  });

  const routerRef: RouterRef = { current: undefined };
  await renderWithDefaultProviders({
    renderer: () => (
      <InstanceProvider>
        <ProcessWrapper>
          <SubmitProbe />
        </ProcessWrapper>
      </InstanceProvider>
    ),
    router: ({ children }) => <InstanceRouter routerRef={routerRef}>{children}</InstanceRouter>,
    waitUntilLoaded: false,
    apis: {
      instanceApi: {
        getInstance: async () =>
          getInstanceWithWorkflow(requestStarted ? { status: 'processing', targetTask: 'Task_2' } : undefined),
      },
    },
  });

  expect(await screen.findByRole('button', { name: 'submit-probe' })).toBeInTheDocument();
  return { pending, routerRef };
}

describe('useProcessNext while the request is pending', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.mocked(doProcessNext).mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('keeps the button visible until polling observes server-side processing', async () => {
    const { pending, routerRef } = await renderPendingProcessNext();

    act(() => screen.getByRole('button', { name: 'submit-probe' }).click());
    expect(screen.getByRole('button', { name: 'submit-probe' })).toBeInTheDocument();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1_000);
    });
    await waitFor(() => expect(screen.getByTestId('loader')).toHaveAttribute('data-reason', 'workflow-processing'));
    expect(screen.queryByRole('button', { name: 'submit-probe' })).not.toBeInTheDocument();

    await act(async () => {
      pending.resolve(processNextResponse(getSettledOnTask2()));
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(routerRef.current!.state.location.pathname).toContain('/Task_2');
  });
});
