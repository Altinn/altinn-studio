import React from 'react';
import { IGenericEditComponent } from '../../componentConfig';
import { IFormAddressComponent } from '../../../../types/global';
import { renderWithMockStore } from '../../../../testing/mocks';
import { AddressComponent } from './AddressComponent';

// Test data:
const component: IFormAddressComponent = {
  dataModelBindings: {
    test: 'test'
  },
  id: '1',
  simplified: false,
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

