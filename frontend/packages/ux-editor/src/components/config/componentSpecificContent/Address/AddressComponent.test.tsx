import React from 'react';
import type { IGenericEditComponent } from '../../componentConfig';
import { renderWithProviders, renderHookWithProviders } from '../../../../testing/mocks';
import { useLayoutSchemaQuery } from '../../../../hooks/queries/useLayoutSchemaQuery';
import { AddressComponent } from './AddressComponent';
import { ComponentType } from 'app-shared/types/ComponentType';
import type { FormAddressComponent } from '../../../../types/FormComponent';
import { waitFor, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// Test data:
const component: FormAddressComponent = {
  type: ComponentType.Address,
  dataModelBindings: {
    address: 'address',
    zipCode: 'zipCode',
    postPlace: 'postPlace',
  },
  id: '1',
  simplified: false,
  itemType: 'COMPONENT',
};
const handleComponentChange = jest.fn();
const defaultProps: IGenericEditComponent<ComponentType.Address> = {
  component,
  handleComponentChange,
};

const user = userEvent.setup();

describe('AddressComponent', () => {
  it('Renders without errors', async () => {
    await render();
    expect(screen.getByRole('group')).toBeInTheDocument();
  });

  it('Handles switch toggle correctly', async () => {
    await render();
    const switchElement = screen.getByRole('checkbox');
    await act(() => user.click(switchElement));
    expect(handleComponentChange).toHaveBeenCalledWith({
      ...component,
      simplified: true,
    });
  });
});

const waitForData = async () => {
  const layoutSchemaResult = renderHookWithProviders(() => useLayoutSchemaQuery()).result;
  await waitFor(() => expect(layoutSchemaResult.current[0].isSuccess).toBe(true));
};

const render = async (props?: Partial<IGenericEditComponent<ComponentType.Address>>) => {
  await waitForData();

  return renderWithProviders(<AddressComponent {...defaultProps} {...props} />);
};
