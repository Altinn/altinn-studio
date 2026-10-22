import React from 'react';

import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { getInstanceWithProcessMock } from 'src/__mocks__/getInstanceDataMock';
import { paymentResponsePayload } from 'src/__mocks__/getPaymentPayloadMock';
import { PaymentContext } from 'src/features/payment/PaymentProvider';
import { PaymentStatus } from 'src/features/payment/types';
import { BackendValidationSeverity } from 'src/features/validation';
import { PaymentComponent } from 'src/layout/Payment/PaymentComponent';
import { doProcessNext } from 'src/queries/queries';
import { renderGenericComponentTest } from 'src/test/renderWithProviders';
import type { PaymentResponsePayload } from 'src/features/payment/types';
import type { BackendValidationIssue } from 'src/features/validation';
import type { RenderGenericComponentTestProps } from 'src/test/renderWithProviders';

vi.mock('src/queries/queries', async () => ({
  ...(await vi.importActual<typeof import('src/queries/queries')>('src/queries/queries')),
  doProcessNext: vi.fn(),
}));

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

function getPaymentTaskInstance() {
  const instance = getInstanceWithProcessMock();
  instance.process.currentTask = { ...instance.process.currentTask!, altinnTaskType: 'payment' };
  instance.process.processTasks = [{ altinnTaskType: 'payment', elementId: 'Task_1' }];
  return instance;
}

function withStatus(status: PaymentStatus): PaymentResponsePayload {
  return { ...paymentResponsePayload, taskId: 'Task_1', status };
}

const renderPaymentTask = async (fetchPaymentInformationForTask: () => Promise<PaymentResponsePayload>) =>
  await renderGenericComponentTest({
    type: 'Payment',
    renderer: (props) => (
      <PaymentContext.Provider value={{ performPayment: () => {}, paymentError: null }}>
        <PaymentComponent {...props} />
      </PaymentContext.Provider>
    ),
    component: { textResourceBindings: { title: 'The payment title' } },
    queries: { fetchPaymentInformationForTask },
    apis: { instanceApi: { getInstance: async () => getPaymentTaskInstance() } },
  });

function refusedWith(code: string) {
  const issue: BackendValidationIssue = {
    code,
    severity: BackendValidationSeverity.Error,
    source: 'payment',
    dataElementId: '',
    noIncrementalUpdates: true,
  };
  return Object.assign(new Error('Request failed with status code 409'), {
    response: { status: 409, data: { validationIssues: [issue] } },
  });
}

describe('PaymentComponent', () => {
  it('should render the title and a help text button when a help text is set', async () => {
    await render({
      component: {
        textResourceBindings: { title: 'The payment title', help: 'this is the help text' },
      },
    });

    expect(screen.getByText('The payment title')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Hjelp/i })).toBeInTheDocument();
  });

  it.each([PaymentStatus.Created, PaymentStatus.Cancelled, PaymentStatus.Failed])(
    'offers to pay or go back when %s',
    async (status) => {
      await renderPaymentTask(async () => withStatus(status));

      expect(await screen.findByRole('button', { name: 'Betal' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Tilbake' })).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Neste' })).not.toBeInTheDocument();
    },
  );

  it('shows that the payment is being processed, without buttons, when Authorized', async () => {
    await renderPaymentTask(async () => withStatus(PaymentStatus.Authorized));

    expect(
      await screen.findByText('Betalingen din behandles. Siden oppdateres når betalingen er fullført.'),
    ).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Betal' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Tilbake' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Neste' })).not.toBeInTheDocument();
  });

  it('fetches the payment again until an Authorized payment is Paid', async () => {
    const fetchPaymentInformation = vi
      .fn<() => Promise<PaymentResponsePayload>>()
      .mockResolvedValueOnce(withStatus(PaymentStatus.Authorized))
      .mockResolvedValue(withStatus(PaymentStatus.Paid));
    await renderPaymentTask(fetchPaymentInformation);

    expect(await screen.findByRole('button', { name: 'Neste' }, { timeout: 5000 })).toBeInTheDocument();
    expect(screen.getByText('Du har betalt!')).toBeInTheDocument();
  });

  it.each([PaymentStatus.Paid, PaymentStatus.Skipped])('offers to go on when %s', async (status) => {
    await renderPaymentTask(async () => withStatus(status));

    expect(await screen.findByRole('button', { name: 'Neste' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Betal' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Tilbake' })).not.toBeInTheDocument();
  });

  it('shows the paid state when going back is refused because the payment has gone through', async () => {
    const fetchPaymentInformation = vi
      .fn<() => Promise<PaymentResponsePayload>>()
      .mockResolvedValueOnce(withStatus(PaymentStatus.Created))
      .mockResolvedValue(withStatus(PaymentStatus.Paid));
    vi.mocked(doProcessNext).mockRejectedValue(refusedWith('PaymentAlreadyCompleted'));
    await renderPaymentTask(fetchPaymentInformation);

    await userEvent.click(await screen.findByRole('button', { name: 'Tilbake' }));

    expect(await screen.findByRole('button', { name: 'Neste' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Tilbake' })).not.toBeInTheDocument();
    expect(vi.mocked(doProcessNext)).toHaveBeenCalledWith(expect.anything(), expect.anything(), 'reject');
  });

  it('shows the current payment state when going on is refused because the payment is not completed', async () => {
    const fetchPaymentInformation = vi
      .fn<() => Promise<PaymentResponsePayload>>()
      .mockResolvedValueOnce(withStatus(PaymentStatus.Paid))
      .mockResolvedValue(withStatus(PaymentStatus.Created));
    vi.mocked(doProcessNext).mockRejectedValue(refusedWith('PaymentNotCompleted'));
    await renderPaymentTask(fetchPaymentInformation);

    await userEvent.click(await screen.findByRole('button', { name: 'Neste' }));

    await waitFor(() =>
      expect(vi.mocked(doProcessNext)).toHaveBeenCalledWith(expect.anything(), expect.anything(), 'confirm'),
    );
    expect(await screen.findByRole('button', { name: 'Betal' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Tilbake' })).toBeInTheDocument();
  });
});
