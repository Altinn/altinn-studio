import React from 'react';
import type { createMemoryRouter } from 'react-router';

import { act, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AxiosHeaders } from 'axios';

import { getInstanceWithProcessMock } from 'src/__mocks__/getInstanceDataMock';
import { defaultDataTypeMock, getLayoutSettingsMock, getUiConfigMock } from 'src/__mocks__/getUiConfigMock';
import { ProcessWrapper } from 'src/components/process/ProcessWrapper';
import { WorkflowTroubleBanner } from 'src/components/process/WorkflowEngine';
import { InstanceProvider } from 'src/features/instance/InstanceContext';
import { useProcessNextOutsideFormProvider } from 'src/features/instance/useProcessNext';
import { useNavigationParam } from 'src/hooks/navigation';
import { doProcessNext } from 'src/queries/queries';
import { InstanceRouter, renderWithDefaultProviders, renderWithInstanceAndLayout } from 'src/test/renderWithProviders';
import type { IInstanceWithProcess } from 'src/core/api-client/instance.api';
import type { IProcess, IProcessWorkflow } from 'src/types/shared';

type RouterRef = { current: ReturnType<typeof createMemoryRouter> | undefined };
type ProcessNextResponse = Awaited<ReturnType<typeof doProcessNext>>;

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

/** Remounts ProcessWrapper when the URL's task changes, as the task route does in the app. */
function RemountPerTask() {
  const taskId = useNavigationParam('taskId');
  return (
    <ProcessWrapper key={taskId}>
      <div data-testid='task-content'>
        <SubmitProbe />
      </div>
    </ProcessWrapper>
  );
}

/**
 * Keeps window.location on the memory router's URL until the test ends, as the browser router does
 * in the app. Code that reads the live URL, such as useIsNavigating, sees a stale one otherwise.
 */
function mirrorRouterUrl(routerRef: RouterRef) {
  const originalUrl = `${window.location.pathname}${window.location.search}`;
  const router = routerRef.current!;
  const mirror = () =>
    window.history.replaceState({}, '', `${router.state.location.pathname}${router.state.location.search}`);
  mirror();
  const unsubscribe = router.subscribe(mirror);
  onTestFinished(() => {
    unsubscribe();
    window.history.replaceState({}, '', originalUrl);
  });
}

const processTasksWithServiceTask: NonNullable<IProcess['processTasks']> = [
  { altinnTaskType: 'data', elementId: 'Task_1', elementType: 'Task' },
  { altinnTaskType: 'scenario', elementId: 'Task_Service', elementType: 'ServiceTask' },
  { altinnTaskType: 'eFormidling', elementId: 'Task_ServiceNoPage', elementType: 'ServiceTask' },
  { altinnTaskType: 'data', elementId: 'Task_2', elementType: 'Task' },
];

/** An instance whose process sits on the given task, with the service task process shape above. */
function getInstanceOnTask(taskId: string, workflow?: IProcessWorkflow): IInstanceWithProcess {
  const instance = getInstanceWithProcessMock();
  const task = processTasksWithServiceTask.find((t) => t.elementId === taskId)!;
  instance.process.processTasks = processTasksWithServiceTask;
  instance.process.currentTask = {
    ...instance.process.currentTask!,
    elementId: taskId,
    name: taskId,
    altinnTaskType: task.altinnTaskType,
    elementType: task.elementType,
  };
  instance.process.workflow = workflow;
  return instance;
}

function setServiceTaskPages(order: string[]) {
  window.altinnAppGlobalData.ui = getUiConfigMock((ui) => {
    ui.folders.Task_Service = getLayoutSettingsMock({ pages: { order } });
    ui.folders.Task_2 = getLayoutSettingsMock({ defaultDataType: defaultDataTypeMock });
  });
}

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

  it('processing shows the standard loader and suppresses the task', async () => {
    // waitUntilLoaded is disabled because the blocking state intentionally renders a loader.
    await renderProcessWrapper({ status: 'processing', targetTask: 'Task_2' }, false);

    await expectWorkflowLoader();
    expect(screen.getByRole('heading', { name: /vent litt, vi henter det du trenger/i })).toBeInTheDocument();
    expect(screen.queryByText(/du kan trygt lukke siden/i)).not.toBeInTheDocument();
    expect(screen.queryByTestId('task-content')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /send inn/i })).not.toBeInTheDocument();
  });

  it.each([
    ['runs', {}],
    ['defers', { waitingReason: 'Waiting for eFormidling to confirm delivery' }],
    ['retries a failed step', { retrying: true, failedAttempts: 2 }],
  ])('a service task with a page renders the page while it %s', async (_, workflow) => {
    // The task reports processing while the process sits on the committed task (targetTask ===
    // currentTask), whether it runs, waits or retries. With a page, the app owns the waiting presentation.
    const instance = getInstanceWithProcessMock();
    instance.process.currentTask!.elementType = 'ServiceTask';
    instance.process.workflow = {
      status: 'processing',
      targetTask: instance.process.currentTask!.elementId,
      ...workflow,
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

  it('a service task with a page keeps it while the workflow continues to the next task', async () => {
    // Once the task completes, the dependent transition targets the next task while the process
    // still sits on the service task. The page stays up instead of the loading view returning.
    const instance = getInstanceWithProcessMock();
    instance.process.currentTask!.elementType = 'ServiceTask';
    instance.process.workflow = { status: 'processing', targetTask: 'Task_Somewhere_Else' };

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
  });

  it("a service task page never shows the loading view's still-working message", async () => {
    // The page owns the waiting presentation; the eight-second message belongs to the loading view.
    vi.useFakeTimers();
    try {
      const instance = getInstanceWithProcessMock();
      instance.process.currentTask!.elementType = 'ServiceTask';
      instance.process.workflow = { status: 'processing', targetTask: instance.process.currentTask!.elementId };

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

      await act(async () => {
        await vi.advanceTimersByTimeAsync(9_000);
      });
      expect(screen.getByTestId('task-content')).toBeInTheDocument();
      expect(screen.queryByText(/du kan trygt lukke siden/i)).not.toBeInTheDocument();
      expect(screen.queryByRole('status')).not.toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });

  it('a service task page shows the trouble banner above its content while a step fails and is retried', async () => {
    const instance = getInstanceWithProcessMock();
    instance.process.currentTask!.elementType = 'ServiceTask';
    instance.process.workflow = {
      status: 'processing',
      targetTask: instance.process.currentTask!.elementId,
      failedAttempts: 2,
    };

    await renderWithInstanceAndLayout({
      renderer: () => (
        <ProcessWrapper>
          <WorkflowTroubleBanner />
          <div data-testid='task-content'>Task content</div>
        </ProcessWrapper>
      ),
      apis: {
        instanceApi: {
          getInstance: async () => instance,
        },
      },
    });

    const content = await screen.findByTestId('task-content');
    const banner = screen.getByRole('status');
    expect(banner).toHaveTextContent(/vi kan ikke behandle skjemaet ditt/i);
    expect(banner.compareDocumentPosition(content) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(screen.queryByTestId('loader')).not.toBeInTheDocument();
  });

  it('a failure after a service task with a page shows the error page, not the page', async () => {
    // The transition onward from the service task failed before committing the next task: no task
    // UI owns that failure, so the terminal error page wins over the service task's page.
    const instance = getInstanceWithProcessMock();
    instance.process.currentTask!.elementType = 'ServiceTask';
    instance.process.workflow = { status: 'failed', targetTask: 'Task_2', failure: { kind: 'stepFailed' } };

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

    expect(await screen.findByText(/vi klarte ikke å fullføre behandlingen av skjemaet/i)).toBeInTheDocument();
    expect(screen.queryByTestId('task-content')).not.toBeInTheDocument();
  });

  it.each([
    { workflow: { status: 'idle' } as const, reason: 'service-task-waiting' },
    { workflow: { status: 'processing', targetTask: 'Task_Service' } as const, reason: 'workflow-processing' },
  ])(
    'a service task whose folder lists no page shows the $reason loading view, not its folder',
    async ({ workflow, reason }) => {
      // An empty pages.order means no page: rendering the folder would end in "Ukjent feil".
      setServiceTaskPages([]);
      await renderWithDefaultProviders({
        renderer: () => (
          <InstanceProvider>
            <ProcessWrapper>
              <div data-testid='task-content'>Task content</div>
            </ProcessWrapper>
          </InstanceProvider>
        ),
        router: ({ children }) => <InstanceRouter taskId='Task_Service'>{children}</InstanceRouter>,
        waitUntilLoaded: false,
        apis: {
          instanceApi: {
            getInstance: async () => getInstanceOnTask('Task_Service', workflow),
          },
        },
      });

      await waitFor(() => expect(screen.getByTestId('loader')).toHaveAttribute('data-reason', reason));
      expect(screen.queryByTestId('task-content')).not.toBeInTheDocument();
    },
  );

  it('processing on a service task without a layout shows the loader', async () => {
    // Without a custom layout, a deferring service task uses the standard loader.
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

  it('processing shows the safe-to-leave alert after eight seconds', async () => {
    // Keep the initial state quiet, then explain what the user can do once a bare loader has lasted
    // long enough to need context.
    vi.useFakeTimers();
    try {
      await renderProcessWrapper({ status: 'processing', targetTask: 'Task_2' }, false);
      await expectWorkflowLoader();
      expect(screen.queryByText(/du kan trygt lukke siden/i)).not.toBeInTheDocument();

      await act(async () => {
        await vi.advanceTimersByTimeAsync(7_999);
      });
      expect(screen.queryByText(/du kan trygt lukke siden/i)).not.toBeInTheDocument();

      await act(async () => {
        await vi.advanceTimersByTimeAsync(1);
      });
      const status = screen.getByRole('status');
      // role='status' is already a polite live region; adding aria-live makes VoiceOver announce twice.
      expect(status).not.toHaveAttribute('aria-live');
      expect(status).toHaveAttribute('aria-atomic', 'true');
      expect(status).toHaveTextContent(/du kan trygt lukke siden/i);
      expect(status.parentElement).toContainElement(screen.getByTestId('loader'));
    } finally {
      vi.useRealTimers();
    }
  });

  it.each([-10 * 60_000, 10 * 60_000])('processing ignores server clock skew of %i milliseconds', async (clockSkew) => {
    vi.useFakeTimers();
    try {
      await renderProcessWrapper(
        {
          status: 'processing',
          targetTask: 'Task_2',
          startedAt: new Date(Date.now() + clockSkew).toISOString(),
          currentTime: new Date(Date.now() + clockSkew).toISOString(),
        },
        false,
      );
      await expectWorkflowLoader();

      await act(async () => {
        await vi.advanceTimersByTimeAsync(7_999);
      });
      expect(screen.queryByText(/du kan trygt lukke siden/i)).not.toBeInTheDocument();

      await act(async () => {
        await vi.advanceTimersByTimeAsync(1);
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

  it('PDF mode renders a non-current PDF service task instead of the wrong-task error', async () => {
    // Previewing a later PDF service task: the URL task (Task_Pdf) differs from process.currentTask
    // (Task_1, the data task the app developer is currently editing). PDF mode must render the PDF
    // service task's snapshot instead of the "part of form completed" wrong-task error, and must not
    // fall back to the default ServiceTaskWaiting view either - PdfWrapper renders the PDF component.
    const instance = getInstanceWithProcessMock();
    instance.process.processTasks = [
      { elementId: 'Task_1', elementType: 'Task', altinnTaskType: 'data' },
      { elementId: 'Task_Pdf', elementType: 'ServiceTask', altinnTaskType: 'pdf' },
    ];

    await renderWithInstanceAndLayout({
      renderer: () => (
        <ProcessWrapper>
          <div data-testid='task-content'>Task content</div>
        </ProcessWrapper>
      ),
      taskId: 'Task_Pdf',
      query: 'pdf=1&task=Task_1',
      apis: {
        instanceApi: {
          getInstance: async () => instance,
        },
      },
    });

    await waitFor(() => expect(document.getElementById('pdfView')).not.toBeNull());
    expect(screen.queryByText(/vi behandler forespørselen din/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/denne delen av skjemaet er ikke tilgjengelig/i)).not.toBeInTheDocument();
  });

  it('outside PDF mode a non-current task still shows the wrong-task error', async () => {
    // Guards against a regression where the PDF-mode carve-out in useIsWrongTask leaks outside PDF
    // mode: a stale/foreign task id in the URL must still be treated as the wrong task.
    // useIsNavigating() also compares against window.location (not just router state), so it must
    // be pointed at the same URL the memory router starts on for the wrong-task state to ever settle.
    const originalUrl = `${window.location.pathname}${window.location.search}`;
    window.history.pushState(
      {},
      '',
      '/ttd/test/instance/512345/75154373-aed4-41f7-95b4-e5b5115c2edc/Task_Pdf/FormLayout',
    );

    try {
      const instance = getInstanceWithProcessMock();
      instance.process.processTasks = [
        { elementId: 'Task_1', elementType: 'Task', altinnTaskType: 'data' },
        { elementId: 'Task_Pdf', elementType: 'ServiceTask', altinnTaskType: 'pdf' },
      ];

      await renderWithInstanceAndLayout({
        renderer: () => (
          <ProcessWrapper>
            <div data-testid='task-content'>Task content</div>
          </ProcessWrapper>
        ),
        taskId: 'Task_Pdf',
        waitUntilLoaded: false,
        apis: {
          instanceApi: {
            getInstance: async () => instance,
          },
        },
      });

      expect(await screen.findByText(/denne delen av skjemaet er ikke tilgjengelig/i)).toBeInTheDocument();
      expect(screen.queryByTestId('task-content')).not.toBeInTheDocument();
    } finally {
      window.history.pushState({}, '', originalUrl);
    }
  });

  it('converges from a service task url after the process moved on to a signing task', async () => {
    // Parked on a service task without a layout (a mailbox wait) while the process advances two
    // tasks on, to signing. The service task's url must keep resolving the service task's own type
    // until the navigation lands; resolving the *current* task's raw type instead classifies the
    // service task's url as a signing task without a layout, and shows the unsupported-task error.
    vi.useFakeTimers();
    const logErrorOnce = vi.spyOn(window, 'logErrorOnce').mockImplementation(() => {});
    try {
      window.altinnAppGlobalData.ui = getUiConfigMock((ui) => {
        ui.folders.Sign = getLayoutSettingsMock({ defaultDataType: defaultDataTypeMock });
      });
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
        router: ({ children }) => (
          <InstanceRouter
            routerRef={routerRef}
            taskId='Approval'
          >
            {children}
          </InstanceRouter>
        ),
        waitUntilLoaded: false,
        apis: {
          instanceApi: {
            getInstance: async () => {
              const instance = getInstanceWithProcessMock();
              instance.process.processTasks = [
                { altinnTaskType: 'data', elementId: 'Task_1', elementType: 'Task' },
                { altinnTaskType: 'externalApproval', elementId: 'Approval', elementType: 'ServiceTask' },
                { altinnTaskType: 'signing', elementId: 'Sign', elementType: 'Task' },
              ];
              if (committed) {
                instance.process.currentTask = {
                  ...instance.process.currentTask!,
                  elementId: 'Sign',
                  name: 'Sign',
                  altinnTaskType: 'signing',
                  elementType: 'Task',
                };
                instance.process.workflow = { status: 'idle' };
              } else {
                instance.process.currentTask = {
                  ...instance.process.currentTask!,
                  elementId: 'Approval',
                  name: 'Approval',
                  altinnTaskType: 'externalApproval',
                  elementType: 'ServiceTask',
                };
                instance.process.workflow = { status: 'processing', targetTask: 'Approval' };
              }
              return instance;
            },
          },
        },
      });

      await expectWorkflowLoader();

      committed = true;
      await act(async () => {
        await vi.advanceTimersByTimeAsync(13_000);
      });

      expect(routerRef.current!.state.location.pathname).toContain('/Sign');
      expect(screen.queryByText(/ukjent feil/i)).not.toBeInTheDocument();
      // The error view is transient here (navigation still converges), so assert it never mounted.
      expect(logErrorOnce).not.toHaveBeenCalled();
    } finally {
      logErrorOnce.mockRestore();
      vi.useRealTimers();
    }
  });

  it.each([
    { altinnTaskType: 'fetchMedicalNote', description: 'a custom task type on a bpmn:task element' },
    { altinnTaskType: 'signing', description: 'a signing task without a layout' },
  ])('renders an in-page error for $description, keeping the app shell', async ({ altinnTaskType }) => {
    const logErrorOnce = vi.spyOn(window, 'logErrorOnce').mockImplementation(() => {});
    try {
      await renderWithInstanceAndLayout({
        renderer: () => (
          <ProcessWrapper>
            <div data-testid='task-content'>Task content</div>
          </ProcessWrapper>
        ),
        waitUntilLoaded: false,
        taskId: 'Task_Unsupported',
        apis: {
          instanceApi: {
            getInstance: async () => {
              const instance = getInstanceWithProcessMock();
              instance.process.currentTask = {
                ...instance.process.currentTask!,
                elementId: 'Task_Unsupported',
                name: 'Task_Unsupported',
                altinnTaskType,
                elementType: 'Task',
              };
              instance.process.processTasks = [{ elementId: 'Task_Unsupported', altinnTaskType, elementType: 'Task' }];
              return instance;
            },
          },
        },
      });

      expect(await screen.findByText('Denne delen av skjemaet kan ikke vises.')).toBeInTheDocument();
      expect(
        screen.getByText(`Prosessteget Task_Unsupported har typen ${altinnTaskType}, som appen ikke kan vise.`),
      ).toBeInTheDocument();
      expect(screen.getByText(/hvis du har behov for assistanse kan du nå altinn/i)).toBeInTheDocument();
      const phoneLink = screen.getByRole('link', { name: '+47 75 00 60 00' });
      expect(phoneLink.closest('li')?.parentElement?.tagName).toBe('UL');
      expect(screen.getByTestId('presentation')).toBeInTheDocument();
      expect(screen.queryByTestId('task-content')).not.toBeInTheDocument();
      expect(screen.queryByText(/ukjent feil/i)).not.toBeInTheDocument();
      // The log is written from an effect, which can run after the text is first found.
      await waitFor(() =>
        expect(logErrorOnce).toHaveBeenCalledWith(
          expect.stringContaining(`'Task_Unsupported' has task type '${altinnTaskType}'`),
        ),
      );
    } finally {
      logErrorOnce.mockRestore();
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

describe('ProcessWrapper on a service task with a page, from the submitting session', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('shows the page from the commit until the next task, while process/next is pending', async () => {
    setServiceTaskPages(['page1']);
    let resolveProcessNext: (response: ProcessNextResponse) => void = () => {};
    let phase: 'form' | 'serviceTask' | 'continuing' | 'nextCommitted' = 'form';
    vi.mocked(doProcessNext).mockImplementationOnce(() => {
      phase = 'serviceTask';
      return new Promise((resolve) => {
        resolveProcessNext = resolve;
      });
    });

    const routerRef: RouterRef = { current: undefined };
    await renderWithDefaultProviders({
      renderer: () => (
        <InstanceProvider>
          <ProcessWrapper>
            <div data-testid='task-content'>
              <SubmitProbe />
            </div>
          </ProcessWrapper>
        </InstanceProvider>
      ),
      router: ({ children }) => <InstanceRouter routerRef={routerRef}>{children}</InstanceRouter>,
      waitUntilLoaded: false,
      apis: {
        instanceApi: {
          getInstance: async () => {
            switch (phase) {
              case 'form':
                return getInstanceOnTask('Task_1', { status: 'idle' });
              case 'serviceTask':
                return getInstanceOnTask('Task_Service', { status: 'processing', targetTask: 'Task_Service' });
              case 'continuing':
                return getInstanceOnTask('Task_Service', { status: 'processing', targetTask: 'Task_2' });
              case 'nextCommitted':
                return getInstanceOnTask('Task_2', { status: 'processing', targetTask: 'Task_2' });
            }
          },
        },
      },
    });

    expect(await screen.findByRole('button', { name: 'submit-probe' })).toBeInTheDocument();
    act(() => screen.getByRole('button', { name: 'submit-probe' }).click());

    // A poll shows the process committed to the service task: the URL follows and the page shows,
    // although process/next has not answered.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1_000);
    });
    expect(routerRef.current!.state.location.pathname).toContain('/Task_Service');
    expect(screen.getByTestId('task-content')).toBeInTheDocument();
    expect(screen.queryByTestId('loader')).not.toBeInTheDocument();

    // The task completes and the workflow continues to the next task: the page stays.
    phase = 'continuing';
    await act(async () => {
      await vi.advanceTimersByTimeAsync(2_000);
    });
    expect(screen.getByTestId('task-content')).toBeInTheDocument();
    expect(screen.queryByTestId('loader')).not.toBeInTheDocument();

    // The next task is committed but the workflow has not settled: the page still stays, with no
    // still-working message.
    phase = 'nextCommitted';
    await act(async () => {
      await vi.advanceTimersByTimeAsync(10_000);
    });
    expect(routerRef.current!.state.location.pathname).toContain('/Task_Service');
    expect(screen.getByTestId('task-content')).toBeInTheDocument();
    expect(screen.queryByTestId('loader')).not.toBeInTheDocument();
    expect(screen.queryByText(/du kan trygt lukke siden/i)).not.toBeInTheDocument();

    await act(async () => {
      resolveProcessNext({
        data: getInstanceOnTask('Task_2', { status: 'idle' }),
        status: 200,
        statusText: 'OK',
        headers: new AxiosHeaders(),
        config: { headers: new AxiosHeaders() },
      });
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(routerRef.current!.state.location.pathname).toContain('/Task_2');
  });

  it('shows the page when moving to the service task remounts ProcessWrapper mid-transition', async () => {
    // In the app, the URL moving to the service task mounts a new ProcessWrapper while process/next
    // is still pending. That mount must show the page, not wait for the response on the loader.
    setServiceTaskPages(['page1']);
    let requestStarted = false;
    vi.mocked(doProcessNext).mockImplementationOnce(() => {
      requestStarted = true;
      return new Promise(() => {});
    });

    const routerRef: RouterRef = { current: undefined };
    await renderWithDefaultProviders({
      renderer: () => (
        <InstanceProvider>
          <RemountPerTask />
        </InstanceProvider>
      ),
      router: ({ children }) => <InstanceRouter routerRef={routerRef}>{children}</InstanceRouter>,
      waitUntilLoaded: false,
      apis: {
        instanceApi: {
          getInstance: async () =>
            requestStarted
              ? getInstanceOnTask('Task_Service', { status: 'processing', targetTask: 'Task_Service' })
              : getInstanceOnTask('Task_1', { status: 'idle' }),
        },
      },
    });

    expect(await screen.findByRole('button', { name: 'submit-probe' })).toBeInTheDocument();
    act(() => screen.getByRole('button', { name: 'submit-probe' }).click());

    await act(async () => {
      await vi.advanceTimersByTimeAsync(2_000);
    });
    expect(routerRef.current!.state.location.pathname).toContain('/Task_Service');
    expect(screen.getByTestId('task-content')).toBeInTheDocument();
    expect(screen.queryByTestId('loader')).not.toBeInTheDocument();
  });

  it('keeps the page when process/next answers with the parked service task, until the next task', async () => {
    // process/next answers once the task defers. The component that called it unmounted when the
    // URL moved to the task, so the response must not navigate there again: that would drop the
    // page the URL is on and remount the task.
    setServiceTaskPages(['page1']);
    let resolveProcessNext: (response: ProcessNextResponse) => void = () => {};
    let phase: 'form' | 'serviceTask' | 'nextCommitted' | 'nextSettled' = 'form';
    vi.mocked(doProcessNext).mockImplementationOnce(() => {
      phase = 'serviceTask';
      return new Promise((resolve) => {
        resolveProcessNext = resolve;
      });
    });

    const routerRef: RouterRef = { current: undefined };
    await renderWithDefaultProviders({
      renderer: () => (
        <InstanceProvider>
          <RemountPerTask />
        </InstanceProvider>
      ),
      router: ({ children }) => <InstanceRouter routerRef={routerRef}>{children}</InstanceRouter>,
      waitUntilLoaded: false,
      apis: {
        instanceApi: {
          getInstance: async () => {
            switch (phase) {
              case 'form':
                return getInstanceOnTask('Task_1', { status: 'idle' });
              case 'serviceTask':
                return getInstanceOnTask('Task_Service', { status: 'processing', targetTask: 'Task_Service' });
              case 'nextCommitted':
                return getInstanceOnTask('Task_2', { status: 'processing', targetTask: 'Task_2' });
              case 'nextSettled':
                return getInstanceOnTask('Task_2', { status: 'idle' });
            }
          },
        },
      },
    });
    mirrorRouterUrl(routerRef);

    expect(await screen.findByRole('button', { name: 'submit-probe' })).toBeInTheDocument();
    act(() => screen.getByRole('button', { name: 'submit-probe' }).click());
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1_000);
    });
    expect(routerRef.current!.state.location.pathname).toMatch(/\/Task_Service$/);

    // In the app, the task's index route redirects to its first page. The router's location carries
    // the basename, which navigate() adds again.
    await act(async () => {
      await routerRef.current!.navigate(`${routerRef.current!.state.location.pathname.replace('/ttd/test', '')}/page1`);
    });
    const locationOnPage = routerRef.current!.state.location;

    await act(async () => {
      resolveProcessNext({
        data: getInstanceOnTask('Task_Service', { status: 'processing', targetTask: 'Task_Service' }),
        status: 200,
        statusText: 'OK',
        headers: new AxiosHeaders(),
        config: { headers: new AxiosHeaders() },
      });
      await vi.advanceTimersByTimeAsync(1_000);
    });
    expect(routerRef.current!.state.location.key).toBe(locationOnPage.key);
    expect(routerRef.current!.state.location.pathname).toMatch(/\/Task_Service\/page1$/);
    expect(screen.getByTestId('task-content')).toBeInTheDocument();
    expect(screen.queryByTestId('loader')).not.toBeInTheDocument();

    // The process moves on while the URL is still on the page. With no call pending, the URL's task
    // differing from the process's is what would show the stale-task error, but the page stays.
    phase = 'nextCommitted';
    await act(async () => {
      await vi.advanceTimersByTimeAsync(10_000);
    });
    expect(routerRef.current!.state.location.pathname).toMatch(/\/Task_Service\/page1$/);
    expect(screen.getByTestId('task-content')).toBeInTheDocument();
    expect(screen.queryByText(/denne delen av skjemaet er ikke tilgjengelig/i)).not.toBeInTheDocument();

    phase = 'nextSettled';
    await act(async () => {
      await vi.advanceTimersByTimeAsync(10_000);
    });
    expect(routerRef.current!.state.location.pathname).toContain('/Task_2');
  });

  it.each([
    { gap: false, description: 'straight away' },
    { gap: true, description: 'after an idle gap between the workflows' },
  ])('gives the page way to the loading view of a next service task without a page, $description', async ({ gap }) => {
    // Rule 2: the page shows until the next task is on screen, and a service task without a page has
    // the loading view as its screen, as after a reload (see the next test). The idle gap between
    // chained workflows keeps the page, and the URL may follow the process from there.
    setServiceTaskPages(['page1']);
    let phase: 'form' | 'serviceTask' | 'gap' | 'noPage' | 'nextCommitted' = 'form';
    vi.mocked(doProcessNext).mockImplementationOnce(() => {
      phase = 'serviceTask';
      return new Promise(() => {});
    });

    const routerRef: RouterRef = { current: undefined };
    await renderWithDefaultProviders({
      renderer: () => (
        <InstanceProvider>
          <RemountPerTask />
        </InstanceProvider>
      ),
      router: ({ children }) => <InstanceRouter routerRef={routerRef}>{children}</InstanceRouter>,
      waitUntilLoaded: false,
      apis: {
        instanceApi: {
          getInstance: async () => {
            switch (phase) {
              case 'form':
                return getInstanceOnTask('Task_1', { status: 'idle' });
              case 'serviceTask':
                return getInstanceOnTask('Task_Service', { status: 'processing', targetTask: 'Task_Service' });
              case 'gap':
                return getInstanceOnTask('Task_Service', { status: 'idle' });
              case 'noPage':
                return getInstanceOnTask('Task_ServiceNoPage', {
                  status: 'processing',
                  targetTask: 'Task_ServiceNoPage',
                });
              case 'nextCommitted':
                return getInstanceOnTask('Task_2', { status: 'processing', targetTask: 'Task_2' });
            }
          },
        },
      },
    });

    expect(await screen.findByRole('button', { name: 'submit-probe' })).toBeInTheDocument();
    act(() => screen.getByRole('button', { name: 'submit-probe' }).click());
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1_000);
    });
    expect(routerRef.current!.state.location.pathname).toContain('/Task_Service');
    expect(screen.getByTestId('task-content')).toBeInTheDocument();

    if (gap) {
      phase = 'gap';
      await act(async () => {
        await vi.advanceTimersByTimeAsync(1_000);
      });
      expect(screen.getByTestId('task-content')).toBeInTheDocument();
      expect(screen.queryByTestId('loader')).not.toBeInTheDocument();
    }

    phase = 'noPage';
    await act(async () => {
      await vi.advanceTimersByTimeAsync(2_000);
    });
    expect(screen.queryByTestId('task-content')).not.toBeInTheDocument();
    expect(screen.getByTestId('loader')).toHaveAttribute('data-reason', 'workflow-processing');

    // The page does not come back once the process has left the task without a page either.
    phase = 'nextCommitted';
    await act(async () => {
      await vi.advanceTimersByTimeAsync(2_000);
    });
    expect(screen.queryByTestId('task-content')).not.toBeInTheDocument();
    expect(screen.getByTestId('loader')).toHaveAttribute('data-reason', 'workflow-processing');
  });

  it('shows the loading view after a reload on the page while the next service task, without a page, runs', async () => {
    setServiceTaskPages(['page1']);
    await renderWithDefaultProviders({
      renderer: () => (
        <InstanceProvider>
          <RemountPerTask />
        </InstanceProvider>
      ),
      router: ({ children }) => <InstanceRouter taskId='Task_Service'>{children}</InstanceRouter>,
      waitUntilLoaded: false,
      apis: {
        instanceApi: {
          getInstance: async () =>
            getInstanceOnTask('Task_ServiceNoPage', { status: 'processing', targetTask: 'Task_ServiceNoPage' }),
        },
      },
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1_000);
    });
    expect(screen.queryByTestId('task-content')).not.toBeInTheDocument();
    expect(screen.getByTestId('loader')).toHaveAttribute('data-reason', 'workflow-processing');
  });

  it('shows the page after a reload on the previous task while the service task runs', async () => {
    setServiceTaskPages(['page1']);
    const routerRef: RouterRef = { current: undefined };
    await renderWithDefaultProviders({
      renderer: () => (
        <InstanceProvider>
          <RemountPerTask />
        </InstanceProvider>
      ),
      router: ({ children }) => (
        <InstanceRouter
          routerRef={routerRef}
          taskId='Task_1'
        >
          {children}
        </InstanceRouter>
      ),
      waitUntilLoaded: false,
      apis: {
        instanceApi: {
          getInstance: async () =>
            getInstanceOnTask('Task_Service', { status: 'processing', targetTask: 'Task_Service' }),
        },
      },
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1_000);
    });
    expect(routerRef.current!.state.location.pathname).toContain('/Task_Service');
    expect(screen.getByTestId('task-content')).toBeInTheDocument();
    expect(screen.queryByTestId('loader')).not.toBeInTheDocument();
  });

  it('follows a feedback task when the process moves on', async () => {
    let advanced = false;
    const routerRef: RouterRef = { current: undefined };
    await renderWithDefaultProviders({
      renderer: () => (
        <InstanceProvider>
          <ProcessWrapper>
            <div data-testid='task-content'>Task content</div>
          </ProcessWrapper>
        </InstanceProvider>
      ),
      router: ({ children }) => (
        <InstanceRouter
          routerRef={routerRef}
          taskId='Task_Feedback'
        >
          {children}
        </InstanceRouter>
      ),
      waitUntilLoaded: false,
      apis: {
        instanceApi: {
          getInstance: async () => {
            const instance = getInstanceWithProcessMock();
            instance.process.processTasks = [
              { altinnTaskType: 'feedback', elementId: 'Task_Feedback', elementType: 'Task' },
              { altinnTaskType: 'data', elementId: 'Task_1', elementType: 'Task' },
            ];
            instance.process.currentTask = advanced
              ? instance.process.currentTask
              : {
                  ...instance.process.currentTask!,
                  elementId: 'Task_Feedback',
                  name: 'Task_Feedback',
                  altinnTaskType: 'feedback',
                  elementType: 'Task',
                };
            return instance;
          },
        },
      },
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(500);
    });
    expect(routerRef.current!.state.location.pathname).toContain('/Task_Feedback');

    advanced = true;
    await act(async () => {
      await vi.advanceTimersByTimeAsync(13_000);
    });
    expect(routerRef.current!.state.location.pathname).toContain('/Task_1');
  });
});
