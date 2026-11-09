import { jest } from '@jest/globals';

import { createFormDataWriteStore } from 'src/features/formData/FormDataWriteStateMachine';
import { makeFormDataMethodProxies } from 'src/test/renderWithProviders';
import type { DataModelState } from 'src/features/formData/FormDataWriteStateMachine';

describe('read-only PDF data', () => {
  it.each([true, false])('runs legacy calculations only on writable data (readonly=%s)', (readonly) => {
    const calculate = jest.fn(() => 'calculated');
    window.ruleHandlerObject = { calculate };
    const currentData = { input: 'new', output: 'original' };
    const debouncedData = { input: 'old', output: 'original' };
    const model: DataModelState = {
      currentData,
      debouncedCurrentData: debouncedData,
      lastSavedData: debouncedData,
      invalidCurrentData: {},
      invalidDebouncedCurrentData: {},
      dataElementId: 'element',
      readonly,
      isDefault: true,
    };
    const { proxies } = makeFormDataMethodProxies({ current: true });
    const store = createFormDataWriteStore(
      { model },
      true,
      proxies,
      { rule: { selectedFunction: 'calculate', inputParams: { input: 'input' }, outParams: { outParam0: 'output' } } },
      {},
      jest.fn(),
    );

    store.getState().debounce('beforeSave');

    expect(calculate).toHaveBeenCalledTimes(readonly ? 0 : 1);
    expect(store.getState().dataModels.model.currentData).toEqual({
      input: 'new',
      output: readonly ? 'original' : 'calculated',
    });
  });
});
