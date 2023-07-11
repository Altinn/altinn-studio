import React from 'react';
import { renderWithMockStore, renderHookWithMockStore } from '../../../../testing/mocks';
import { useLayoutSchemaQuery } from '../../../../hooks/queries/useLayoutSchemaQuery';
import { AddressComponent, AddressComponentProps } from './AddressComponent';
import { ComponentType } from 'app-shared/types/ComponentType';
import type { FormAddressComponent } from '../../../../types/FormComponent';
import { waitFor, screen } from '@testing-library/react';

// Test data:
const component: FormAddressComponent = {
  type: ComponentType.AddressComponent,
  dataModelBindings: {
    test: 'test',
  },
  id: '1',
  simplified: false,
  itemType: 'COMPONENT',
};
const handleComponentChange = jest.fn();
const defaultProps: AddressComponentProps = {
  component,
  handleComponentChange,
  isProd: true,
};

describe('AddressComponent', () => {
  it('Renders without errors', async () => {
    await render();
    expect(screen.getByTestId('address-component-container')).toBeInTheDocument();
  });

  it('renders nothing when isProd is false', async () => {
    await render({ isProd: false });
    expect(screen.queryByTestId('address-component-container')).not.toBeInTheDocument();
  });
});

const waitForData = async () => {
  const layoutSchemaResult = renderHookWithMockStore()(() => useLayoutSchemaQuery())
    .renderHookResult.result;
  await waitFor(() => expect(layoutSchemaResult.current[0].isSuccess).toBe(true));
};

const render = async (props?: Partial<AddressComponentProps>) => {
  await waitForData();

  return renderWithMockStore()(<AddressComponent {...defaultProps} {...props} />);
};
