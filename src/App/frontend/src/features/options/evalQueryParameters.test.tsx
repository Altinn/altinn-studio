import React, { useEffect, useState } from 'react';

import { act, screen, waitFor } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import type { IQueryParameters } from '@app/layout-contract/generated/common.generated';

import { getFormBootstrapMock } from 'src/__mocks__/getFormBootstrapMock';
import { defaultDataTypeMock } from 'src/__mocks__/getUiConfigMock';
import { useResolvedQueryParameters } from 'src/features/options/evalQueryParameters';
import { renderGenericComponentTest } from 'src/test/renderWithProviders';

it('keeps resolved query parameters stable across rerenders and data changes with equal results', async () => {
  window.altinnAppGlobalData.ui.settings = {
    ...window.altinnAppGlobalData.ui.settings,
    autoSaveBehavior: 'onChangePage',
  };
  const queryParameters: IQueryParameters = {
    amount: ['if', ['greaterThan', ['dataModel', 'amount'], 100], 'high', 'else', 'low'],
  };
  const onRender = vi.fn();
  const onEffect = vi.fn();
  function Probe() {
    const [renderCount, setRenderCount] = useState(0);
    const resolved = useResolvedQueryParameters(queryParameters);
    onRender(resolved);
    useEffect(() => {
      onEffect(resolved);
    }, [resolved]);
    return <button onClick={() => setRenderCount((count) => count + 1)}>Render {renderCount}</button>;
  }
  const { formDataMethods } = await renderGenericComponentTest({
    type: 'PaymentDetails',
    renderer: () => <Probe />,
    queries: {
      fetchFormBootstrapForInstance: async () =>
        getFormBootstrapMock((obj) => {
          obj.dataModels[defaultDataTypeMock].schema = { type: 'object', properties: { amount: { type: 'number' } } };
          obj.dataModels[defaultDataTypeMock].initialData = { amount: 150 };
        }),
    },
  });
  const initial = onRender.mock.lastCall?.[0];
  expect(initial).toEqual({ amount: 'high' });
  await userEvent.click(screen.getByRole('button', { name: 'Render 0' }));
  expect(onRender.mock.lastCall?.[0]).toBe(initial);
  expect(onEffect).toHaveBeenCalledTimes(1);

  const rendersBeforeChange = onRender.mock.calls.length;
  await act(async () => {
    formDataMethods.setLeafValue({ reference: { dataType: defaultDataTypeMock, field: 'amount' }, newValue: 160 });
    formDataMethods.debounce('forced');
  });
  await waitFor(() => expect(onRender.mock.calls.length).toBeGreaterThan(rendersBeforeChange));
  expect(onRender.mock.lastCall?.[0]).toBe(initial);
  expect(onEffect).toHaveBeenCalledTimes(1);

  await act(async () => {
    formDataMethods.setLeafValue({ reference: { dataType: defaultDataTypeMock, field: 'amount' }, newValue: 50 });
    formDataMethods.debounce('forced');
  });
  await waitFor(() => expect(onEffect).toHaveBeenCalledTimes(2));
  expect(onRender.mock.lastCall?.[0]).toEqual({ amount: 'low' });
  expect(onRender.mock.lastCall?.[0]).not.toBe(initial);
});
