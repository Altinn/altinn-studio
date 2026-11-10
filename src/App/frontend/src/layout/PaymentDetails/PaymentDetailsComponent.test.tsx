import React from 'react';

import { act, screen, waitFor } from '@testing-library/react';

import { getFormBootstrapMock } from 'src/__mocks__/getFormBootstrapMock';
import { getInstanceWithProcessMock } from 'src/__mocks__/getInstanceDataMock';
import { defaultDataTypeMock } from 'src/__mocks__/getUiConfigMock';
import { PaymentDetailsComponent } from 'src/layout/PaymentDetails/PaymentDetailsComponent';
import { renderGenericComponentTest } from 'src/test/renderWithProviders';
import type { RenderGenericComponentTestProps } from 'src/test/renderWithProviders';

const render = async ({
  component,
  queries,
  ...rest
}: Partial<RenderGenericComponentTestProps<'PaymentDetails'>> = {}) =>
  await renderGenericComponentTest({
    type: 'PaymentDetails',
    queries: {
      getInstance: async () => {
        const instance = getInstanceWithProcessMock();
        instance.process.processTasks!.push({ elementId: 'payment', altinnTaskType: 'payment' });
        return instance;
      },
      ...queries,
    },
    renderer: (props) => <PaymentDetailsComponent {...props} />,
    ...rest,
    component: {
      textResourceBindings: { title: 'The order details title' },
      ...component,
    },
  });

describe('PaymentDetailsComponent', () => {
  it('refetches when a saved value inside an array dependency changes', async () => {
    window.altinnAppGlobalData.ui.settings = {
      ...window.altinnAppGlobalData.ui.settings,
      autoSaveBehavior: 'onChangePage',
    };
    const { formDataMethods, queries } = await render({
      component: { refetchDependencies: { inventory: ['dataModel', 'items'] } },
      queries: {
        fetchFormBootstrapForInstance: async () =>
          getFormBootstrapMock((obj) => {
            obj.dataModels[defaultDataTypeMock].schema = {
              type: 'object',
              properties: {
                items: {
                  type: 'array',
                  items: { type: 'object', properties: { price: { type: 'number' } } },
                },
              },
            };
            obj.dataModels[defaultDataTypeMock].initialData = { items: [{ price: 10 }] };
          }),
      },
    });
    await waitFor(() => expect(queries.fetchOrderDetails).toHaveBeenCalledTimes(2));
    queries.fetchOrderDetails.mockClear();

    await act(async () => {
      formDataMethods.setLeafValue({
        reference: { dataType: defaultDataTypeMock, field: 'items[0].price' },
        newValue: 20,
      });
      formDataMethods.debounce('forced');
    });
    expect(queries.fetchOrderDetails).not.toHaveBeenCalled();
    await act(async () => {
      formDataMethods.saveFinished({
        savedData: { [defaultDataTypeMock]: { items: [{ price: 20 }] } },
        newDataModels: [],
        validationIssues: undefined,
      });
    });
    await waitFor(() => expect(queries.fetchOrderDetails).toHaveBeenCalledTimes(1));
  });

  it('refetches after a saved data change alters the expression result, but not when the result stays equal', async () => {
    window.altinnAppGlobalData.ui.settings = {
      ...window.altinnAppGlobalData.ui.settings,
      autoSaveBehavior: 'onChangePage',
    };
    const { formDataMethods, queries } = await render({
      component: {
        refetchDependencies: { amount: ['if', ['greaterThan', ['dataModel', 'amount'], 100], 'high', 'else', 'low'] },
      },
      queries: {
        fetchFormBootstrapForInstance: async () =>
          getFormBootstrapMock((obj) => {
            obj.dataModels[defaultDataTypeMock].schema = {
              type: 'object',
              properties: { amount: { type: 'number' } },
            };
            obj.dataModels[defaultDataTypeMock].initialData = { amount: 50 };
          }),
      },
    });
    await waitFor(() => expect(queries.fetchOrderDetails).toHaveBeenCalledTimes(2));
    queries.fetchOrderDetails.mockClear();

    await act(async () => {
      formDataMethods.setLeafValue({ reference: { dataType: defaultDataTypeMock, field: 'amount' }, newValue: 150 });
      formDataMethods.debounce('forced');
    });
    expect(queries.fetchOrderDetails).not.toHaveBeenCalled();
    await act(async () => {
      formDataMethods.saveFinished({
        savedData: { [defaultDataTypeMock]: { amount: 150 } },
        newDataModels: [],
        validationIssues: undefined,
      });
    });
    await waitFor(() => expect(queries.fetchOrderDetails).toHaveBeenCalledTimes(1));
    queries.fetchOrderDetails.mockClear();

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
    expect(queries.fetchOrderDetails).not.toHaveBeenCalled();
  });

  it('only fetches the initial order without refetch dependencies', async () => {
    const { queries } = await render();
    expect(queries.fetchOrderDetails).toHaveBeenCalledTimes(1);
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
