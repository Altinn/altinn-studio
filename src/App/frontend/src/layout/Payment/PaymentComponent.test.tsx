import { toast } from 'react-toastify';

import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { getInstanceWithProcessMock } from 'src/__mocks__/getInstanceDataMock';
import { paymentResponsePayload } from 'src/__mocks__/getPaymentPayloadMock';
import { defaultDataTypeMock, getLayoutSettingsMock, getUiConfigMock } from 'src/__mocks__/getUiConfigMock';
import { createHttpErrorMock } from 'src/__mocks__/httpErrorMock';
import { PaymentContext } from 'src/features/payment/PaymentProvider';
import { PaymentStatus } from 'src/features/payment/types';
import { PaymentComponent } from 'src/layout/Payment/PaymentComponent';
import { renderGenericComponentTest } from 'src/test/renderWithProviders';
import type { AppMutations, AppQueries } from 'src/core/queries/types';
import type { PaymentResponsePayload } from 'src/features/payment/types';
import type { RenderGenericComponentTestProps } from 'src/test/renderWithProviders';
import type { IProcessWorkflow } from 'src/types/shared';

vi.mock('react-toastify', async () => {
  const actual = await vi.importActual<typeof import('react-toastify')>('react-toastify');
  return { ...actual, toast: Object.assign(vi.fn(), actual.toast) };
});

const render = async ({ component }: Partial<RenderGenericComponentTestProps<'Payment'>> = {}) =>
  await renderGenericComponentTest({
    type: 'Payment',
    renderer: (props) => (
      <PaymentContext.Provider value={{ performPayment: () => {}, paymentError: null }}>
        <PaymentComponent {...props} />
      </PaymentContext.Provider>
    ),
    component: {
      textResourceBindings: { title: 'The payment title' },
      ...component,
    },
  });

const paymentAttempt: IProcessWorkflow = { status: 'processing', targetTask: 'Task_1', awaitingMessages: true };

function getPaymentTaskInstance(workflow?: IProcessWorkflow, taskId = 'Task_1') {
  return getInstanceWithProcessMock((process) => {
    process.currentTask!.elementId = taskId;
    process.currentTask!.altinnTaskType = 'payment';
    process.processTasks = [
      { elementId: 'Task_0', altinnTaskType: 'data' },
      { elementId: 'Task_1', altinnTaskType: 'payment' },
    ];
    process.workflow = workflow;
  });
}

function withStatus(status: PaymentStatus): PaymentResponsePayload {
  return { ...paymentResponsePayload, taskId: 'Task_1', status };
}

interface PaymentTaskProps {
  status: PaymentStatus;
  workflow?: IProcessWorkflow;
  queries?: Partial<AppQueries>;
  mutations?: Partial<AppMutations>;
}

// Each render gets its own instance, as the payment provider calls pay and check once per instance and page load
const renderPaymentTask = async ({ status, workflow, queries, mutations }: PaymentTaskProps) =>
  await renderGenericComponentTest({
    type: 'Payment',
    renderer: (props) => <PaymentComponent {...props} />,
    component: { textResourceBindings: { title: 'The payment title' } },
    instanceId: `512345/${crypto.randomUUID()}`,
    queries: {
      fetchPaymentInformationForTask: async () => withStatus(status),
      getInstance: async () => getPaymentTaskInstance(workflow),
      ...queries,
    },
    mutations,
  });

function paymentButtons() {
  return screen.queryAllByRole('button').map((button) => button.textContent);
}

describe('PaymentComponent', () => {
  beforeEach(() => {
    vi.mocked(toast).mockClear();
  });

  it('should render the title and a help text button when a help text is set', async () => {
    await render({
      component: {
        textResourceBindings: { title: 'The payment title', help: 'this is the help text' },
      },
    });

    expect(screen.getByText('The payment title')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Hjelp/i })).toBeInTheDocument();
  });

  it.each([
    [PaymentStatus.Created, 'on an idle task', undefined, ['Tilbake', 'Betal'], undefined],
    [PaymentStatus.Cancelled, 'on an idle task', undefined, ['Tilbake', 'Betal'], undefined],
    [PaymentStatus.Failed, 'on an idle task', undefined, ['Tilbake', 'Betal'], 'Betalingen feilet'],
    [
      PaymentStatus.Created,
      'during a payment attempt',
      paymentAttempt,
      ['Tilbake', 'Fortsett til betaling'],
      undefined,
    ],
    [
      PaymentStatus.Authorized,
      'during a payment attempt',
      paymentAttempt,
      [],
      'Betalingen din behandles. Siden oppdateres når betalingen er fullført.',
    ],
    [PaymentStatus.Paid, 'during a payment attempt', paymentAttempt, [], 'Du har betalt!'],
  ])('offers what the payment allows when it is %s %s', async (status, _, workflow, buttons, alert) => {
    await renderPaymentTask({ status, workflow });

    expect(paymentButtons()).toEqual(buttons);
    if (alert) {
      expect(screen.getByText(alert)).toBeInTheDocument();
    }
  });

  it('goes back by cancelling the payment attempt, and follows the process without reading the payment again', async () => {
    window.altinnAppGlobalData.ui = getUiConfigMock((ui) => {
      ui.folders.Task_0 = getLayoutSettingsMock({ defaultDataType: defaultDataTypeMock });
    });
    let attemptEnded = false;
    const doCancelPayment = vi.fn<AppMutations['doCancelPayment']>(async () => {
      attemptEnded = true;
      return withStatus(PaymentStatus.Uninitialized);
    });
    const doProcessNext = vi.fn<AppMutations['doProcessNext']>();
    const { routerRef, queries } = await renderPaymentTask({
      status: PaymentStatus.Created,
      queries: {
        getInstance: async () =>
          attemptEnded ? getPaymentTaskInstance(undefined, 'Task_0') : getPaymentTaskInstance(paymentAttempt),
      },
      mutations: { doCancelPayment, doProcessNext },
    });

    await userEvent.click(screen.getByRole('button', { name: 'Tilbake' }));

    await waitFor(() => expect(routerRef.current?.state.location.pathname).toContain('/Task_0'));
    expect(doCancelPayment).toHaveBeenCalledTimes(1);
    expect(doProcessNext).not.toHaveBeenCalled();
    expect(toast).not.toHaveBeenCalled();
    expect(queries.fetchPaymentInformationForTask).toHaveBeenCalledTimes(1);
  });

  it.each([
    ['the attempt has ended', 409, { type: 'payment-attempt-not-open' }],
    ['the task is not a payment task', 400, {}],
    ['the cancel is still being handled', 504, {}],
    ['the attempt has failed', 409, { processNextState: 'resumeRequired' }],
  ])('shows no error when the cancel answers that %s, and follows the process', async (_, status, body) => {
    vi.spyOn(window, 'logError').mockImplementation(() => {});
    onTestFinished(() => {
      vi.restoreAllMocks();
    });
    window.altinnAppGlobalData.ui = getUiConfigMock((ui) => {
      ui.folders.Task_0 = getLayoutSettingsMock({ defaultDataType: defaultDataTypeMock });
    });
    let processMoved = false;
    const { routerRef } = await renderPaymentTask({
      status: PaymentStatus.Created,
      queries: {
        getInstance: async () =>
          processMoved ? getPaymentTaskInstance(undefined, 'Task_0') : getPaymentTaskInstance(paymentAttempt),
      },
      mutations: {
        doCancelPayment: async () => {
          processMoved = true;
          throw createHttpErrorMock(status, { ...body, status });
        },
      },
    });

    await userEvent.click(screen.getByRole('button', { name: 'Tilbake' }));

    await waitFor(() => expect(routerRef.current?.state.location.pathname).toContain('/Task_0'));
    expect(toast).not.toHaveBeenCalled();
  });

  it('goes back with process/next and reject on an idle payment task', async () => {
    const { mutations } = await renderPaymentTask({ status: PaymentStatus.Cancelled });

    await userEvent.click(screen.getByRole('button', { name: 'Tilbake' }));

    await waitFor(() =>
      expect(mutations.doProcessNext.mock).toHaveBeenCalledWith(expect.anything(), expect.anything(), 'reject'),
    );
    expect(mutations.doCancelPayment.mock).not.toHaveBeenCalled();
  });

  it('continues to the checkout of the open payment attempt', async () => {
    const assign = vi.fn();
    vi.spyOn(window, 'location', 'get').mockReturnValue({ ...window.location, assign });
    onTestFinished(() => {
      vi.restoreAllMocks();
    });
    await renderPaymentTask({ status: PaymentStatus.Created, workflow: paymentAttempt });

    await userEvent.click(screen.getByRole('button', { name: 'Fortsett til betaling' }));

    expect(assign).toHaveBeenCalledWith(paymentResponsePayload.paymentDetails!.redirectUrl);
  });

  it.each([
    [500, 'workflow-failed'],
    [503, 'workflow-engine-unavailable'],
    [409, 'payment-attempt-message-limit'],
  ])('says that going back failed when the cancel answers %s %s', async (status, type) => {
    vi.spyOn(window, 'logError').mockImplementation(() => {});
    onTestFinished(() => {
      vi.restoreAllMocks();
    });
    const doCancelPayment = vi.fn<AppMutations['doCancelPayment']>(async () => {
      throw createHttpErrorMock(status, { type, status });
    });
    await renderPaymentTask({
      status: PaymentStatus.Created,
      workflow: paymentAttempt,
      mutations: { doCancelPayment },
    });

    await userEvent.click(screen.getByRole('button', { name: 'Tilbake' }));

    await waitFor(() =>
      expect(toast).toHaveBeenCalledWith(
        expect.objectContaining({ props: { id: 'payment.cancel_failed' } }),
        expect.objectContaining({ type: 'error' }),
      ),
    );
    expect(screen.getByRole('button', { name: 'Tilbake' })).toBeInTheDocument();
  });

  it('shows the payment as being processed when the attempt refuses the cancel of a reserved payment', async () => {
    vi.spyOn(window, 'logError').mockImplementation(() => {});
    onTestFinished(() => {
      vi.restoreAllMocks();
    });
    let status = PaymentStatus.Created;
    const doCancelPayment = vi.fn<AppMutations['doCancelPayment']>(async () => {
      status = PaymentStatus.Authorized;
      throw createHttpErrorMock(409, { type: 'payment-authorized', status: 409 });
    });
    await renderPaymentTask({
      status,
      workflow: paymentAttempt,
      queries: { fetchPaymentInformationForTask: async () => withStatus(status) },
      mutations: { doCancelPayment },
    });

    await userEvent.click(screen.getByRole('button', { name: 'Tilbake' }));

    expect(
      await screen.findByText('Betalingen din behandles. Siden oppdateres når betalingen er fullført.'),
    ).toBeInTheDocument();
    expect(paymentButtons()).toEqual([]);
    expect(toast).not.toHaveBeenCalled();
  });

  it('shows the open payment attempt, not the failure, when pay fails after the attempt opened', async () => {
    vi.spyOn(window, 'logError').mockImplementation(() => {});
    onTestFinished(() => {
      vi.restoreAllMocks();
    });
    let attemptOpened = false;
    const { mutations } = await renderPaymentTask({
      status: PaymentStatus.Uninitialized,
      queries: {
        fetchPaymentInformationForTask: async () =>
          withStatus(attemptOpened ? PaymentStatus.Created : PaymentStatus.Uninitialized),
        getInstance: async () => getPaymentTaskInstance(attemptOpened ? paymentAttempt : undefined),
      },
      mutations: {
        doPerformAction: async () => {
          attemptOpened = true;
          throw createHttpErrorMock(500, { error: { code: 'WorkflowFailed' } });
        },
      },
    });

    expect(await screen.findByRole('button', { name: 'Fortsett til betaling' })).toBeInTheDocument();
    expect(paymentButtons()).toEqual(['Tilbake', 'Fortsett til betaling']);
    expect(screen.queryByText('Betalingen feilet')).not.toBeInTheDocument();
    await waitFor(() => expect(mutations.doCheckPayment.mock).toHaveBeenCalledTimes(1));
  });
});
