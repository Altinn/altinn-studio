import React, { useEffect } from 'react';

import { act, screen } from '@testing-library/react';

import { getDataModelBootstrapMock, getFormBootstrapMock } from 'src/__mocks__/getFormBootstrapMock';
import { FormStore } from 'src/features/form/FormContext';
import { FormProvider } from 'src/features/form/FormProvider';
import { FDSetValueReadOnly } from 'src/features/formData/FormDataWriteStateMachine';
import { InstanceProvider } from 'src/features/instance/InstanceContext';
import { InstanceRouter, renderWithoutInstanceAndLayout } from 'src/test/renderWithProviders';
import type { FormStoreApi } from 'src/features/form/FormContext';
import type { FormDataMethods } from 'src/features/formData/FormDataWriteStateMachine';

const dataType = 'test-data-model';
const valueReference = { field: 'value', dataType };
const listReference = { field: 'items', dataType };
const initialData = { value: 'saved', items: ['one', 'two'] };

function Probe({ onStore }: { onStore: (store: FormStoreApi) => void }) {
  const store = FormStore.raw.useStore();
  const readOnly = FormStore.useIsReadOnly();
  useEffect(() => {
    onStore(store);
  }, [store, onStore]);
  return <output>{readOnly ? 'read only' : 'editable'}</output>;
}

async function render(query?: string) {
  const storeRef: { current: FormStoreApi | undefined } = { current: undefined };
  const onStore = (store: FormStoreApi) => {
    storeRef.current = store;
  };
  function Form({ readOnly = false }: { readOnly?: boolean }) {
    return (
      <InstanceProvider>
        <FormProvider readOnly={readOnly}>
          <Probe onStore={onStore} />
        </FormProvider>
      </InstanceProvider>
    );
  }
  const result = await renderWithoutInstanceAndLayout({
    renderer: () => <Form />,
    router: ({ children }) => <InstanceRouter query={query}>{children}</InstanceRouter>,
    queries: {
      fetchFormBootstrapForInstance: async () =>
        getFormBootstrapMock({
          dataModels: {
            [dataType]: getDataModelBootstrapMock({
              initialData,
              schema: {
                type: 'object',
                properties: { value: { type: 'string' }, items: { type: 'array', items: { type: 'string' } } },
              },
            }),
          },
        }),
    },
  });
  return { ...result, storeRef, Form };
}

describe('read-only form data', () => {
  it('blocks every form data write operation in PDF mode, including direct setter calls', async () => {
    const { storeRef, mutations } = await render('pdf=1');
    expect(await screen.findByText('read only')).toBeInTheDocument();
    const callback = vi.fn();
    const attemptedWrites: ((actions: FormDataMethods) => void)[] = [
      (data) => data.setLeafValue({ reference: valueReference, newValue: 'changed', callback }),
      (data) => data.setMultiLeafValues({ changes: [{ reference: valueReference, newValue: 'changed' }] }),
      (data) => data.appendToList({ reference: listReference, newValue: 'three' }),
      (data) => data.appendToListUnique({ reference: listReference, newValue: 'three' }),
      (data) => data.removeIndexFromList({ reference: listReference, index: 0 }),
      (data) => data.removeValueFromList({ reference: listReference, value: 'one' }),
      (data) => data.removeFromListCallback({ reference: listReference, callback: () => true }),
    ];
    const logError = vi.spyOn(window, 'logError').mockImplementation(() => {});
    try {
      act(() => {
        for (const write of attemptedWrites) {
          write(storeRef.current!.getState().data);
        }
      });
      expect(callback).toHaveBeenCalledWith(FDSetValueReadOnly);
      expect(storeRef.current!.getState().data.models[dataType].currentData).toEqual(initialData);
      expect(mutations.doPatchMultipleFormData.mock).not.toHaveBeenCalled();
      expect(document.body).not.toHaveAttribute('data-unsaved-changes');
    } finally {
      logError.mockRestore();
    }
  });

  it('updates the store when readOnly changes without a new bootstrap response', async () => {
    const { Form, rerender, queries, storeRef } = await render();
    expect(await screen.findByText('editable')).toBeInTheDocument();

    rerender(<Form readOnly={true} />);
    expect(await screen.findByText('read only')).toBeInTheDocument();
    expect(storeRef.current!.getState().readOnly).toBe(true);
    expect(queries.fetchFormBootstrapForInstance).toHaveBeenCalledTimes(1);

    rerender(<Form readOnly={false} />);
    expect(await screen.findByText('editable')).toBeInTheDocument();
    expect(storeRef.current!.getState().readOnly).toBe(false);
  });
});
