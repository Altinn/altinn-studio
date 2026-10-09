import React from 'react';
import { toast } from 'react-toastify';
import type { createMemoryRouter } from 'react-router';

import { act, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AxiosHeaders } from 'axios';

import { getFormBootstrapMock } from 'src/__mocks__/getFormBootstrapMock';
import { getInstanceWithProcessMock } from 'src/__mocks__/getInstanceDataMock';
import { defaultDataTypeMock } from 'src/__mocks__/getUiConfigMock';
import { ProcessWrapper } from 'src/components/process/ProcessWrapper';
import { FormStore } from 'src/features/form/FormContext';
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

function FormValueProbe() {
  const value = FormStore.data.useCurrentPick({ dataType: defaultDataTypeMock, field: 'name' });
  return (
    <input
      aria-label='Name'
      readOnly
      value={String(value ?? '')}
    />
  );
}

function createAxiosLikeError(status: number, data: Record<string, unknown>) {
  return Object.assign(new Error(`Request failed with status code ${status}`), {
    response: { status, data },
  });
}

// setupTests makes window.logError throw, so unhandled workflow failures also fail these tests.
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

    await waitFor(() => expect(screen.getByTestId('loader')).toHaveAttribute('data-reason', 'workflow-processing'));
    expect(screen.queryByRole('button', { name: /prøv igjen/i })).not.toBeInTheDocument();
  });

  it('a 409 with processNextState=instanceChanged reloads the form and tells the user it changed', async () => {
    const logError = vi.spyOn(window, 'logError').mockImplementation(() => {});
    const user = userEvent.setup();
    let serverValue = 'before';
    vi.mocked(doProcessNext).mockImplementation(async () => {
      serverValue = 'changed by another user';
      throw createAxiosLikeError(409, {
        title: 'The instance changed before the transition started.',
        processNextState: 'instanceChanged',
        validationIssues: null,
      });
    });

    await renderWithInstanceAndLayout({
      renderer: () => (
        <ProcessWrapper>
          <FormValueProbe />
          <SubmitProbe />
        </ProcessWrapper>
      ),
      queries: {
        fetchFormBootstrapForInstance: async () =>
          getFormBootstrapMock((bootstrap) => {
            bootstrap.dataModels[defaultDataTypeMock].initialData = { name: serverValue };
          }),
      },
      apis: {
        instanceApi: {
          getInstance: async () => getInstanceWithWorkflow({ status: 'idle' }),
        },
      },
    });
    expect(screen.getByRole('textbox', { name: 'Name' })).toHaveValue('before');

    await user.click(screen.getByRole('button', { name: 'submit-probe' }));

    await waitFor(() =>
      expect(toast).toHaveBeenCalledWith(
        expect.objectContaining({ props: { id: 'process_error.instance_changed' } }),
        expect.objectContaining({ type: 'error' }),
      ),
    );
    await waitFor(() => expect(screen.getByRole('textbox', { name: 'Name' })).toHaveValue('changed by another user'));
    expect(logError).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('button', { name: 'submit-probe' })).toBeInTheDocument();
  });

  it('a server error shows the localized retry message instead of its detail', async () => {
    const logError = vi.spyOn(window, 'logError').mockImplementation(() => {});
    const user = userEvent.setup();
    await renderFailingProcessNext(
      {
        title: 'The process could not move on from the current task.',
        detail: 'Could not decide where the process goes next.',
      },
      500,
      { status: 'idle' },
    );

    await user.click(screen.getByRole('button', { name: 'submit-probe' }));

    await waitFor(() =>
      expect(toast).toHaveBeenCalledWith(
        expect.objectContaining({ props: { id: 'process_error.submit_error_please_retry' } }),
        expect.objectContaining({ type: 'error' }),
      ),
    );
    expect(logError).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('button', { name: 'submit-probe' })).toBeInTheDocument();
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
