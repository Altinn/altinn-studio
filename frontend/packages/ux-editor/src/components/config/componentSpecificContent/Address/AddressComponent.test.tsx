import React from 'react';
import { IGenericEditComponent } from '../../componentConfig';
import { renderWithMockStore, renderHookWithMockStore } from '../../../../testing/mocks';
import { useLayoutSchemaQuery } from '../../../../hooks/queries/useLayoutSchemaQuery';
import { AddressComponent } from './AddressComponent';
import { ComponentType } from 'app-shared/types/ComponentType';
import type { FormAddressComponent } from '../../../../types/FormComponent';
import { waitFor } from '@testing-library/react';

// Test data:
const component: FormAddressComponent = {
  type: ComponentType.AddressComponent,
  dataModelBindings: {
    test: 'test'
  },
  id: '1',
  simplified: false,
  itemType: 'COMPONENT',
};
const handleComponentChange = jest.fn();
const defaultProps: IGenericEditComponent = {
  component,
  handleComponentChange,
};

describe('AddressComponent', () => {
  it('Renders without errors', async () => {
    await render();
  });
});

const waitForData = async () => {
  const layoutSchemaResult = renderHookWithMockStore()(() => useLayoutSchemaQuery()).renderHookResult.result;
  await waitFor(() => expect(layoutSchemaResult.current.isSuccess).toBe(true));
};

const render = async (props?: Partial<IGenericEditComponent>) => {
  await waitForData();

  return renderWithMockStore()(<AddressComponent {...defaultProps} {...props} />);
}

