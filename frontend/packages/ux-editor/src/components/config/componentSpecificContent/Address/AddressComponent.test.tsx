import React from 'react';
import { IGenericEditComponent } from '../../componentConfig';
import { renderWithMockStore } from '../../../../testing/mocks';
import { AddressComponent } from './AddressComponent';
import { ComponentType } from 'app-shared/types/ComponentType';
import type { FormAddressComponent } from '../../../../types/FormComponent';

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
  it('Renders without errors', () => {
    render();
  });
});

const render = (props?: Partial<IGenericEditComponent>) =>
  renderWithMockStore()(<AddressComponent {...defaultProps} {...props} />);

