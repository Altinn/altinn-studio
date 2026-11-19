import React from 'react';
import { useNavigate, useParams } from 'react-router';

import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { getInstanceWithProcessMock } from 'src/__mocks__/getInstanceDataMock';
import { orderDetailsResponsePayload } from 'src/__mocks__/getOrderDetailsPayloadMock';
import { paymentResponsePayload } from 'src/__mocks__/getPaymentPayloadMock';
import { useInstanceDataQuery } from 'src/core/queries/instance';
import {
  OrderDetailsProvider,
  PaymentInformationProvider,
  useOrderDetails,
  usePaymentInformation,
  usePerformPayActionMutation,
} from 'src/core/queries/payment';
import { useSetCurrentLanguage } from 'src/features/language/LanguageProvider';
import { PaymentStatus } from 'src/features/payment/types';
import { InstanceRouter, renderWithDefaultProviders } from 'src/test/renderWithProviders';
import { CookieStorage } from 'src/utils/cookieStorage/CookieStorage';

beforeEach(() => CookieStorage.removeItem('lang_12345'));
afterEach(() => CookieStorage.removeItem('lang_12345'));

function PaymentProbe() {
  const info = usePaymentInformation();
  const order = useOrderDetails();
  const setLanguage = useSetCurrentLanguage();
  const navigate = useNavigate();
  const { instanceOwnerPartyId, instanceGuid } = useParams();
  const payment = usePerformPayActionMutation(instanceOwnerPartyId, instanceGuid);
  const { refetch } = useInstanceDataQuery();
  return (
    <>
      <div>
        Payment: {info?.taskId} {info?.status}
      </div>
      <div>Order: {order?.orderReference}</div>
      <button onClick={() => setLanguage('en')}>English</button>
      <button onClick={() => navigate('/instance/123/other-instance/Task_1/FormLayout')}>Other instance</button>
      <button onClick={() => refetch()}>Refresh process</button>
      <button onClick={() => payment.mutate()}>Pay</button>
    </>
  );
}

async function renderPayment() {
  window.altinnAppGlobalData.availableLanguages.push({ language: 'en' });
  let taskId = 'Task_1';
  let status = PaymentStatus.Created;
  const result = await renderWithDefaultProviders({
    router: ({ children }) => <InstanceRouter instanceId='123/first-instance'>{children}</InstanceRouter>,
    renderer: () => (
      <PaymentInformationProvider>
        <OrderDetailsProvider>
          <PaymentProbe />
        </OrderDetailsProvider>
      </PaymentInformationProvider>
    ),
    queries: {
      getInstance: async () =>
        getInstanceWithProcessMock((process) => {
          process.currentTask!.elementId = taskId;
          process.currentTask!.altinnTaskType = 'payment';
          process.processTasks = [{ elementId: taskId, altinnTaskType: 'payment' }];
        }),
      fetchPaymentInformationForTask: async (_instanceId, _language, requestedTaskId) => ({
        ...paymentResponsePayload,
        taskId: requestedTaskId ?? '',
        status,
      }),
      fetchOrderDetails: async (instanceId, language) => ({
        ...orderDetailsResponsePayload,
        orderReference: `${instanceId}:${language}`,
      }),
    },
    mutations: {
      doPerformAction: async () => {
        status = PaymentStatus.Paid;
        return { instance: undefined, redirectUrl: '' };
      },
    },
  });
  await screen.findByText('Payment: Task_1 Created');
  await screen.findByText('Order: 123/first-instance:nb');
  return {
    ...result,
    changeTask: () => {
      taskId = 'Task_2';
    },
  };
}

it('loads order details for the newly selected instance', async () => {
  await renderPayment();
  await userEvent.click(screen.getByRole('button', { name: 'Other instance' }));
  expect(await screen.findByText('Order: 123/other-instance:nb')).toBeInTheDocument();
});

it('loads translated payment information and order details when the language changes', async () => {
  const { queries } = await renderPayment();
  await userEvent.click(screen.getByRole('button', { name: 'English' }));
  expect(await screen.findByText('Order: 123/first-instance:en')).toBeInTheDocument();
  expect(queries.fetchPaymentInformationForTask).toHaveBeenLastCalledWith('123/first-instance', 'en', 'Task_1');
});

it('loads payment information for the current task after a process refresh', async () => {
  const { changeTask } = await renderPayment();
  changeTask();
  await userEvent.click(screen.getByRole('button', { name: 'Refresh process' }));
  expect(await screen.findByText('Payment: Task_2 Created')).toBeInTheDocument();
});

it('refreshes payment status after a successful pay action without a redirect', async () => {
  await renderPayment();
  await userEvent.click(screen.getByRole('button', { name: 'Pay' }));
  expect(await screen.findByText('Payment: Task_1 Paid')).toBeInTheDocument();
});
