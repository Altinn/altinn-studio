import { screen } from '@testing-library/react';

import { getDataModelBootstrapMock, getFormBootstrapMock } from 'src/__mocks__/getFormBootstrapMock';
import { getInstanceWithProcessMock } from 'src/__mocks__/getInstanceDataMock';
import { defaultDataTypeMock } from 'src/__mocks__/getUiConfigMock';
import { FormStore } from 'src/features/form/FormContext';
import { renderGenericComponentTest } from 'src/test/renderWithProviders';

function WritableDataTypes() {
  return <div data-testid='writable'>{FormStore.bootstrap.useWritableDataTypes().join(',')}</div>;
}

describe('useWritableDataTypes', () => {
  it('lists the data models the bootstrap response says are writable, whether their elements are locked or not', async () => {
    await renderGenericComponentTest({
      type: 'Paragraph',
      renderer: () => <WritableDataTypes />,
      component: { textResourceBindings: {} },
      queries: {
        getInstance: async () => {
          const instance = getInstanceWithProcessMock();
          instance.data.forEach((element) => (element.locked = true));
          return instance;
        },
        fetchFormBootstrapForInstance: async () =>
          getFormBootstrapMock((obj) => {
            obj.dataModels.other = getDataModelBootstrapMock({ dataElementId: 'other-element', writable: false });
          }),
      },
    });

    expect(screen.getByTestId('writable')).toHaveTextContent(new RegExp(`^${defaultDataTypeMock}$`));
  });
});
