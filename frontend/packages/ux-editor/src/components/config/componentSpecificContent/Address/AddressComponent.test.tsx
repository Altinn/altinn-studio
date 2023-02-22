import React from 'react';
import { IGenericEditComponent } from '../../componentConfig';
import { IFormAddressComponent } from '../../../../types/global';
import { renderWithMockStore } from '../../../../testing/mocks';
import { AddressComponent } from './AddressComponent';
import { ComponentTypes } from '../../../';
import { mockUseTranslation } from '../../../../../../../testing/mocks/i18nMock';

// Test data:
const component: IFormAddressComponent = {
  type: ComponentTypes.AddressComponent,
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

// Mocks:
jest.mock(
  'react-i18next',
  () => ({ useTranslation: () => mockUseTranslation() }),
);

describe('AddressComponent', () => {
  it('Renders without errors', () => {
    render();
  });
});

const render = (props?: Partial<IGenericEditComponent>) =>
  renderWithMockStore()(<AddressComponent {...defaultProps} {...props} />);

