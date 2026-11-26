import { act, screen, waitFor } from '@testing-library/react';

import { getInstanceWithProcessMock } from 'src/__mocks__/getInstanceDataMock';
import { paymentResponsePayload } from 'src/__mocks__/getPaymentPayloadMock';
import { defaultDataTypeMock, getLayoutSettingsMock, getUiConfigMock } from 'src/__mocks__/getUiConfigMock';
import { createHttpErrorMock } from 'src/__mocks__/httpErrorMock';
import { usePaymentInformation } from 'src/core/queries/payment';
import { PaymentStatus } from 'src/features/payment/types';
import { renderWithInstanceAndLayout } from 'src/test/renderWithProviders';
import type { AppMutations, AppQueries } from 'src/core/queries/types';
import type { PaymentResponsePayload } from 'src/features/payment/types';
import type { IProcessWorkflow } from 'src/types/shared';

const paymentAttempt: IProcessWorkflow = { status: 'processing', targetTask: 'Task_1', awaitingMessages: true };

function getPaymentTaskInstance(workflow?: IProcessWorkflow, taskId = 'Task_1') {
  return getInstanceWithProcessMock((process) => {
    process.currentTask!.elementId = taskId;
    process.currentTask!.altinnTaskType = taskId === 'Task_1' ? 'payment' : 'data';
    process.processTasks = [
      { elementId: 'Task_1', altinnTaskType: 'payment' },
      { elementId: 'Task_2', altinnTaskType: 'data' },
    ];
    process.workflow = workflow;
  });
}

function withStatus(status: PaymentStatus): PaymentResponsePayload {
  return { ...paymentResponsePayload, taskId: 'Task_1', status };
}

function PaymentStatusProbe() {
  const paymentInformation = usePaymentInformation();
  return (
    <>
      <div>Payment: {paymentInformation?.status}</div>
      <div>Payment id: {paymentInformation?.paymentDetails?.paymentId}</div>
    </>
  );
}

interface RenderProps {
  status: PaymentStatus;
  workflow?: IProcessWorkflow;
  taskId?: string;
  instanceId?: string;
  query?: string;
  queries?: Partial<AppQueries>;
  mutations?: Partial<AppMutations>;
}

// The provider calls pay and check once per instance and page load, so each test gets its own instance
function newInstanceId() {
  return `512345/${crypto.randomUUID()}`;
}

async function renderPaymentTask({
  status,
  workflow,
  taskId,
  instanceId = newInstanceId(),
  query,
  queries,
  mutations,
}: RenderProps) {
  return await renderWithInstanceAndLayout({
    renderer: () => <PaymentStatusProbe />,
    instanceId,
    taskId,
    query,
    waitUntilLoaded: false,
    queries: {
      fetchPaymentInformationForTask: async () => withStatus(status),
      getInstance: async () => getPaymentTaskInstance(workflow, taskId),
      ...queries,
    },
    mutations,
  });
}

describe('PaymentProvider', () => {
  it.each([PaymentStatus.Uninitialized, PaymentStatus.Paid, PaymentStatus.Authorized, PaymentStatus.Skipped])(
    'calls pay on landing on an idle payment task when the payment is %s',
    async (status) => {
      const { mutations } = await renderPaymentTask({ status });

      await waitFor(() => expect(mutations.doPerformAction.mock).toHaveBeenCalledTimes(1));
      expect(mutations.doPerformAction.mock.mock.calls[0][2]).toEqual({ action: 'pay' });
    },
  );

  it.each([PaymentStatus.Created, PaymentStatus.Cancelled, PaymentStatus.Failed])(
    'leaves paying to the user on an idle payment task when the payment is %s',
    async (status) => {
      const { mutations } = await renderPaymentTask({ status });

      expect(await screen.findByText(`Payment: ${status}`)).toBeInTheDocument();
      expect(mutations.doPerformAction.mock).not.toHaveBeenCalled();
    },
  );

  it('does not call pay while a payment attempt holds the task', async () => {
    const { mutations } = await renderPaymentTask({ status: PaymentStatus.Authorized, workflow: paymentAttempt });

    expect(await screen.findByText('Payment: Authorized')).toBeInTheDocument();
    expect(mutations.doPerformAction.mock).not.toHaveBeenCalled();
  });

  it('follows the process when pay answers without a redirect', async () => {
    window.altinnAppGlobalData.ui = getUiConfigMock((ui) => {
      ui.folders.Task_2 = getLayoutSettingsMock({ defaultDataType: defaultDataTypeMock });
    });
    let paid = false;
    const { routerRef } = await renderPaymentTask({
      status: PaymentStatus.Uninitialized,
      queries: {
        getInstance: async () => (paid ? getPaymentTaskInstance(undefined, 'Task_2') : getPaymentTaskInstance()),
      },
      mutations: {
        doPerformAction: async () => {
          paid = true;
          return { instance: undefined, redirectUrl: '' };
        },
      },
    });

    await waitFor(() => expect(routerRef.current?.state.location.pathname).toContain('/Task_2'));
  });

  it('follows the process when pay fails', async () => {
    vi.spyOn(window, 'logError').mockImplementation(() => {});
    onTestFinished(() => {
      vi.restoreAllMocks();
    });
    window.altinnAppGlobalData.ui = getUiConfigMock((ui) => {
      ui.folders.Task_2 = getLayoutSettingsMock({ defaultDataType: defaultDataTypeMock });
    });
    let moved = false;
    const { routerRef } = await renderPaymentTask({
      status: PaymentStatus.Paid,
      queries: {
        getInstance: async () => (moved ? getPaymentTaskInstance(undefined, 'Task_2') : getPaymentTaskInstance()),
      },
      mutations: {
        doPerformAction: async () => {
          moved = true;
          throw createHttpErrorMock(500, { error: { code: 'WorkflowFailed' } });
        },
      },
    });

    await waitFor(() => expect(routerRef.current?.state.location.pathname).toContain('/Task_2'));
  });

  it('checks the payment once per page load while a payment attempt holds the task', async () => {
    const instanceId = newInstanceId();
    const first = await renderPaymentTask({ status: PaymentStatus.Created, workflow: paymentAttempt, instanceId });
    await waitFor(() => expect(first.mutations.doCheckPayment.mock).toHaveBeenCalledTimes(1));
    first.unmount();

    const second = await renderPaymentTask({ status: PaymentStatus.Created, workflow: paymentAttempt, instanceId });

    expect(await screen.findByText('Payment: Created')).toBeInTheDocument();
    expect(second.mutations.doCheckPayment.mock).not.toHaveBeenCalled();
  });

  it('does not check the payment on an idle payment task', async () => {
    const { mutations } = await renderPaymentTask({ status: PaymentStatus.Cancelled });

    expect(await screen.findByText('Payment: Cancelled')).toBeInTheDocument();
    expect(mutations.doCheckPayment.mock).not.toHaveBeenCalled();
  });

  it('does not check the payment when a user action holds a task that is not a payment task', async () => {
    window.altinnAppGlobalData.ui = getUiConfigMock((ui) => {
      ui.folders.Task_2 = getLayoutSettingsMock({ defaultDataType: defaultDataTypeMock });
    });
    const { mutations } = await renderPaymentTask({
      status: PaymentStatus.Created,
      workflow: { ...paymentAttempt, targetTask: 'Task_2' },
      taskId: 'Task_2',
    });

    expect(await screen.findByText('Payment id:')).toBeInTheDocument();
    expect(mutations.doCheckPayment.mock).not.toHaveBeenCalled();
  });

  it('does not check the payment in PDF mode', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    onTestFinished(() => {
      vi.useRealTimers();
    });
    const { mutations } = await renderPaymentTask({
      status: PaymentStatus.Authorized,
      workflow: paymentAttempt,
      query: 'pdf=1',
    });

    expect(await screen.findByText('Payment: Authorized')).toBeInTheDocument();
    await act(() => vi.advanceTimersByTimeAsync(60_000));
    expect(mutations.doCheckPayment.mock).not.toHaveBeenCalled();
  });

  it('shows the payment that the check answers with when its status changed', async () => {
    const { queries } = await renderPaymentTask({
      status: PaymentStatus.Created,
      workflow: paymentAttempt,
      mutations: { doCheckPayment: async () => withStatus(PaymentStatus.Authorized) },
    });

    expect(await screen.findByText('Payment: Authorized')).toBeInTheDocument();
    expect(queries.fetchPaymentInformationForTask).toHaveBeenCalledTimes(1);
  });

  it('follows the process when the check finds the payment paid', async () => {
    window.altinnAppGlobalData.ui = getUiConfigMock((ui) => {
      ui.folders.Task_2 = getLayoutSettingsMock({ defaultDataType: defaultDataTypeMock });
    });
    let paid = false;
    const { routerRef } = await renderPaymentTask({
      status: PaymentStatus.Created,
      queries: {
        getInstance: async () =>
          paid ? getPaymentTaskInstance(undefined, 'Task_2') : getPaymentTaskInstance(paymentAttempt),
      },
      mutations: {
        doCheckPayment: async () => {
          paid = true;
          return withStatus(PaymentStatus.Paid);
        },
      },
    });

    await waitFor(() => expect(routerRef.current?.state.location.pathname).toContain('/Task_2'));
  });

  it('keeps the shown payment when the check finds the same status', async () => {
    const getInstance = vi.fn(async () => getPaymentTaskInstance(paymentAttempt));
    let instanceReadsWhenChecked = Infinity;
    await renderPaymentTask({
      status: PaymentStatus.Created,
      queries: { getInstance },
      mutations: {
        doCheckPayment: async () => {
          instanceReadsWhenChecked = getInstance.mock.calls.length;
          const checked = withStatus(PaymentStatus.Created);
          return { ...checked, paymentDetails: { ...checked.paymentDetails!, paymentId: 'from-the-check' } };
        },
      },
    });

    // The process poll goes on during the attempt; two more reads mean the check's answer has been handled
    await waitFor(() => expect(getInstance.mock.calls.length).toBeGreaterThan(instanceReadsWhenChecked + 1));
    expect(screen.getByText(`Payment id: ${paymentResponsePayload.paymentDetails!.paymentId}`)).toBeInTheDocument();
  });

  it('checks a reserved payment again until the check finds that its status changed', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    onTestFinished(() => {
      vi.useRealTimers();
    });
    const statuses = [PaymentStatus.Authorized, PaymentStatus.Authorized, PaymentStatus.Paid];
    const { mutations } = await renderPaymentTask({
      status: PaymentStatus.Authorized,
      workflow: paymentAttempt,
      mutations: { doCheckPayment: async () => withStatus(statuses.shift() ?? PaymentStatus.Paid) },
    });

    await act(() => vi.advanceTimersByTimeAsync(5000));
    expect(await screen.findByText('Payment: Paid')).toBeInTheDocument();
    await act(() => vi.advanceTimersByTimeAsync(60_000));
    expect(mutations.doCheckPayment.mock).toHaveBeenCalledTimes(3);
  });

  it('does not check again while the payment waits for the user at the checkout', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    onTestFinished(() => {
      vi.useRealTimers();
    });
    const { mutations } = await renderPaymentTask({
      status: PaymentStatus.Created,
      workflow: paymentAttempt,
      mutations: { doCheckPayment: async () => withStatus(PaymentStatus.Created) },
    });

    expect(await screen.findByText('Payment: Created')).toBeInTheDocument();
    await act(() => vi.advanceTimersByTimeAsync(60_000));
    expect(mutations.doCheckPayment.mock).toHaveBeenCalledTimes(1);
  });

  it('does not start a check while one is pending', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    onTestFinished(() => {
      vi.useRealTimers();
    });
    let pendingChecks = 0;
    let mostPendingChecks = 0;
    const { mutations } = await renderPaymentTask({
      status: PaymentStatus.Authorized,
      workflow: paymentAttempt,
      mutations: {
        doCheckPayment: async () => {
          mostPendingChecks = Math.max(mostPendingChecks, ++pendingChecks);
          await new Promise((resolve) => setTimeout(resolve, 2500));
          pendingChecks--;
          return withStatus(PaymentStatus.Authorized);
        },
      },
    });

    expect(await screen.findByText('Payment: Authorized')).toBeInTheDocument();
    await act(() => vi.advanceTimersByTimeAsync(10_000));
    expect(mutations.doCheckPayment.mock.mock.calls.length).toBeGreaterThan(1);
    expect(mostPendingChecks).toBe(1);
  });

  it('keeps showing the stored payment when the check fails', async () => {
    vi.spyOn(window, 'logError').mockImplementation(() => {});
    onTestFinished(() => {
      vi.restoreAllMocks();
    });
    const { mutations } = await renderPaymentTask({
      status: PaymentStatus.Created,
      workflow: paymentAttempt,
      mutations: {
        doCheckPayment: async () => {
          throw createHttpErrorMock(502, { type: 'payment-processor-unavailable', status: 502 });
        },
      },
    });

    await waitFor(() => expect(mutations.doCheckPayment.mock).toHaveBeenCalled());
    expect(await screen.findByText('Payment: Created')).toBeInTheDocument();
  });
});
