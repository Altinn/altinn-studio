import React from 'react';
import { IGenericEditComponent } from '../../componentConfig';
import { renderWithMockStore } from '../../../../testing/mocks';
import { AddressComponent } from './AddressComponent';
import { FormItemType } from 'app-shared/types/FormItemType';
import type { FormAddressComponent } from '../../../../types/FormComponent';

// Test data:
const component: FormAddressComponent = {
  type: FormItemType.AddressComponent,
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

