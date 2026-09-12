import React from 'react';
import { toast } from 'react-toastify';
import type { createMemoryRouter } from 'react-router';

import { act, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { getInstanceWithProcessMock } from 'src/__mocks__/getInstanceDataMock';
import { ProcessWrapper } from 'src/components/process/ProcessWrapper';
import { InstanceProvider, PROCESS_NEXT_IN_FLIGHT_POLL_MS } from 'src/features/instance/InstanceContext';
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
async function renderFailingProcessNext(errorBody: Record<string, unknown>, status: number, after?: IProcessWorkflow) {
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
    expect(await screen.findByText(/vi jobber med skjemaet ditt/i)).toBeInTheDocument();
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

    expect(await screen.findByText(/vi jobber med skjemaet ditt/i)).toBeInTheDocument();
  });

  it('a failure whose refetched live status is idle is still logged and toasted', async () => {
    // The convergence rule below (in-flight live status) is narrow: with nothing live to render,
    // the error path must still report the failure.
    const logError = vi.spyOn(window, 'logError').mockImplementation(() => {});
    const user = userEvent.setup();
    await renderFailingProcessNext({ title: 'Internal server error' }, 500);

    await user.click(screen.getByRole('button', { name: 'submit-probe' }));

    await waitFor(() => expect(toast).toHaveBeenCalledTimes(1));
    expect(logError).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('button', { name: 'submit-probe' })).toBeInTheDocument();
  });
});

type RouterRef = { current: ReturnType<typeof createMemoryRouter> | undefined };
type ProcessNextResponse = Awaited<ReturnType<typeof doProcessNext>>;

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
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

/**
 * The read between two chained workflows: the transition has committed to the service task and its
 * auto-advance workflow is not enqueued yet, so the collection has no active head and the read path
 * reports idle ON the service task - indistinguishable from a parked task, and not a settle.
 */
function getIdleGapOnServiceTask(): IInstanceWithProcess {
  const instance = getInstanceWithProcessMock();
  instance.process.processTasks = [
    { altinnTaskType: 'data', elementId: 'Task_1' },
    { altinnTaskType: 'data', elementId: 'Task_2' },
  ];
  instance.process.currentTask!.elementId = 'Task_Service';
  instance.process.currentTask!.name = 'Task_Service';
  instance.process.currentTask!.elementType = 'ServiceTask';
  instance.process.workflow = { status: 'idle' };
  return instance;
}

/**
 * Renders the production provider order (InstanceProvider > ProcessWrapper) around a submit probe,
 * with a process/next call that stays in flight until the test settles it, and an instance read
 * that reports what the backend's read path would: no annotation before the call, `processing`
 * while it is in flight, the idle gap on the service task once the test flips `phase.gap`, and the
 * settled Task_2 once it flips `phase.settled`.
 */
async function renderInFlightProcessNext() {
  const pending = deferred<ProcessNextResponse>();
  const phase = { inFlight: false, gap: false, settled: false };
  vi.mocked(doProcessNext).mockImplementation(() => {
    phase.inFlight = true;
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
        getInstance: async () => {
          if (phase.settled) {
            return getSettledOnTask2();
          }
          if (phase.gap) {
            return getIdleGapOnServiceTask();
          }
          return getInstanceWithWorkflow(phase.inFlight ? { status: 'processing', targetTask: 'Task_2' } : undefined);
        },
      },
    },
  });

  expect(await screen.findByRole('button', { name: 'submit-probe' })).toBeInTheDocument();
  return { pending, phase, routerRef };
}

async function clickSubmitAndAwaitFirstPoll() {
  await act(async () => {
    screen.getByRole('button', { name: 'submit-probe' }).click();
  });
  // One in-flight poll tick plus slack for the read to land and the wrapper to re-render.
  await act(async () => {
    await vi.advanceTimersByTimeAsync(PROCESS_NEXT_IN_FLIGHT_POLL_MS + 500);
  });
}

describe('useProcessNext in-flight live status', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.mocked(doProcessNext).mockReset();
    vi.mocked(toast).mockClear();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('replaces the task with the advancing view while process/next is still in flight', async () => {
    const { pending, phase, routerRef } = await renderInFlightProcessNext();

    await clickSubmitAndAwaitFirstPoll();

    // The call has not returned, yet the poll observed the enqueued workflow and the wrapper swapped
    // the task (and its submit affordance) for the advancing view - the same screen a reload shows.
    expect(screen.getByText(/vi jobber med skjemaet ditt/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'submit-probe' })).not.toBeInTheDocument();
    expect(doProcessNext).toHaveBeenCalledTimes(1);

    // The call returns with the settled instance: the session lands on Task_2 like any successful
    // process/next, with the task UI back.
    phase.settled = true;
    await act(async () => {
      pending.resolve({ data: getSettledOnTask2() } as ProcessNextResponse);
      await vi.advanceTimersByTimeAsync(500);
    });
    expect(routerRef.current!.state.location.pathname).toContain('/Task_2');
    expect(await screen.findByRole('button', { name: 'submit-probe' })).toBeInTheDocument();
    expect(toast).not.toHaveBeenCalled();
  });

  it('keeps the advancing view when polls read a committed task ahead of the response, and lets the response navigate', async () => {
    // Two reads can precede the response in the submitting session: the idle gap between two chained
    // workflows (idle ON the service task - a false settle), and the genuinely settled target. Neither
    // may tear down the advancing view or steer the URL - the response's handlers navigate - so the
    // user never sees a stray task UI or a blank frame between the advancing view and Task_2.
    const { pending, phase, routerRef } = await renderInFlightProcessNext();

    await clickSubmitAndAwaitFirstPoll();
    expect(screen.getByText(/vi jobber med skjemaet ditt/i)).toBeInTheDocument();

    phase.gap = true;
    await act(async () => {
      await vi.advanceTimersByTimeAsync(4_000);
    });
    expect(screen.getByText(/vi jobber med skjemaet ditt/i)).toBeInTheDocument();
    expect(screen.queryByText(/vi behandler forespørselen din/i)).not.toBeInTheDocument();
    expect(routerRef.current!.state.location.pathname).toContain('/Task_1');

    phase.settled = true;
    await act(async () => {
      await vi.advanceTimersByTimeAsync(4_000);
    });
    expect(screen.getByText(/vi jobber med skjemaet ditt/i)).toBeInTheDocument();
    expect(routerRef.current!.state.location.pathname).toContain('/Task_1');

    await act(async () => {
      pending.resolve({ data: getSettledOnTask2() } as ProcessNextResponse);
      await vi.advanceTimersByTimeAsync(500);
    });
    expect(routerRef.current!.state.location.pathname).toContain('/Task_2');
    expect(await screen.findByRole('button', { name: 'submit-probe' })).toBeInTheDocument();
    expect(toast).not.toHaveBeenCalled();
  });

  it('a 504 timeout after the swap keeps the advancing view and keeps polling until the transition settles', async () => {
    // The backend's synchronous wait gives up after ~100s while the engine keeps working. Because
    // setupTests makes window.logError throw, this also proves the mutation's error path is not
    // taken: the timeout body is consumed by the state machine, the page the poll already put up
    // stays, and the processing-state poll carries the session onto the committed task.
    const { pending, phase, routerRef } = await renderInFlightProcessNext();

    await clickSubmitAndAwaitFirstPoll();
    expect(screen.getByText(/vi jobber med skjemaet ditt/i)).toBeInTheDocument();

    await act(async () => {
      pending.reject(
        createAxiosLikeError(504, {
          title: 'Something went wrong while moving to the next task.',
          detail: 'Timeout while waiting for workflows to complete.',
          workflowFailure: { kind: 'timeout' },
        }),
      );
      await vi.advanceTimersByTimeAsync(500);
    });
    expect(screen.getByText(/vi jobber med skjemaet ditt/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'submit-probe' })).not.toBeInTheDocument();

    // The transition settles out-of-band; one processing-state poll window (2-3s) plus slack.
    phase.settled = true;
    await act(async () => {
      await vi.advanceTimersByTimeAsync(4_000);
    });
    expect(routerRef.current!.state.location.pathname).toContain('/Task_2');
    expect(await screen.findByRole('button', { name: 'submit-probe' })).toBeInTheDocument();
    expect(toast).not.toHaveBeenCalled();
  });

  it('a bodiless failure after the swap converges on the live status instead of toasting', async () => {
    // An intermediary cutting the long wait (a gateway 504 with no problem body) or a dropped
    // connection reaches the mutation's error path. The refetched status says the engine is still
    // working, and that page is already on screen - a toast repeating the transport error would
    // only contradict it.
    const logError = vi.spyOn(window, 'logError').mockImplementation(() => {});
    const { pending } = await renderInFlightProcessNext();

    await clickSubmitAndAwaitFirstPoll();
    expect(screen.getByText(/vi jobber med skjemaet ditt/i)).toBeInTheDocument();

    await act(async () => {
      pending.reject(createAxiosLikeError(504, {}));
      await vi.advanceTimersByTimeAsync(500);
    });

    expect(logError).toHaveBeenCalledTimes(1);
    expect(toast).not.toHaveBeenCalled();
    expect(screen.getByText(/vi jobber med skjemaet ditt/i)).toBeInTheDocument();
  });
});
