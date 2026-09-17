import React from 'react';

import { act, screen, waitFor } from '@testing-library/react';

import { getFormBootstrapMock } from 'src/__mocks__/getFormBootstrapMock';
import { defaultDataTypeMock } from 'src/__mocks__/getUiConfigMock';
import { PaymentDetailsComponent } from 'src/layout/PaymentDetails/PaymentDetailsComponent';
import { renderGenericComponentTest } from 'src/test/renderWithProviders';
import type { RenderGenericComponentTestProps } from 'src/test/renderWithProviders';

const refetchOrderDetails = vi.hoisted(() => vi.fn());
vi.mock('src/features/payment/OrderDetailsProvider', async (importOriginal) => ({
  ...(await importOriginal<typeof import('src/features/payment/OrderDetailsProvider')>()),
  useRefetchOrderDetails: () => refetchOrderDetails,
}));

const render = async ({ component, ...rest }: Partial<RenderGenericComponentTestProps<'PaymentDetails'>> = {}) =>
  await renderGenericComponentTest({
    type: 'PaymentDetails',
    renderer: (props) => <PaymentDetailsComponent {...props} />,
    ...rest,
    component: {
      textResourceBindings: { title: 'The order details title' },
      ...component,
    },
  });

describe('PaymentDetailsComponent', () => {
  it('refetches after a saved data change alters the expression result, but not when the result stays equal', async () => {
    window.altinnAppGlobalData.ui.settings = {
      ...window.altinnAppGlobalData.ui.settings,
      autoSaveBehavior: 'onChangePage',
    };
    const { formDataMethods } = await render({
      component: {
        queryParameters: { amount: ['if', ['greaterThan', ['dataModel', 'amount'], 100], 'high', 'else', 'low'] },
      },
      queries: {
        fetchFormBootstrapForInstance: async () =>
          getFormBootstrapMock((obj) => {
            obj.dataModels[defaultDataTypeMock].schema = { type: 'object', properties: { amount: { type: 'number' } } };
            obj.dataModels[defaultDataTypeMock].initialData = { amount: 50 };
          }),
      },
    });
    await waitFor(() => expect(refetchOrderDetails).toHaveBeenCalledTimes(1));
    refetchOrderDetails.mockClear();

    await act(async () => {
      formDataMethods.setLeafValue({ reference: { dataType: defaultDataTypeMock, field: 'amount' }, newValue: 150 });
      formDataMethods.debounce('forced');
    });
    expect(refetchOrderDetails).not.toHaveBeenCalled();
    await act(async () => {
      formDataMethods.saveFinished({
        savedData: { [defaultDataTypeMock]: { amount: 150 } },
        newDataModels: [],
        validationIssues: undefined,
      });
    });
    await waitFor(() => expect(refetchOrderDetails).toHaveBeenCalledTimes(1));
    refetchOrderDetails.mockClear();

    await act(async () => {
      formDataMethods.setLeafValue({ reference: { dataType: defaultDataTypeMock, field: 'amount' }, newValue: 160 });
      formDataMethods.debounce('forced');
    });
    await act(async () => {
      formDataMethods.saveFinished({
        savedData: { [defaultDataTypeMock]: { amount: 160 } },
        newDataModels: [],
        validationIssues: undefined,
      });
    });
    expect(refetchOrderDetails).not.toHaveBeenCalled();
  });

  it('does not trigger a refetch without query parameters', async () => {
    await render();
    expect(refetchOrderDetails).not.toHaveBeenCalled();
  });

  it('should render the title and a help text button when a help text is set', async () => {
    await render({
      component: {
        textResourceBindings: { title: 'The order details title', help: 'this is the help text' },
      },
    });

    expect(screen.getByText('The order details title')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Hjelp/i })).toBeInTheDocument();
  });
});
