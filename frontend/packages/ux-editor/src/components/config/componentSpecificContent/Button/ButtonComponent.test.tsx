import React from 'react';
import { IGenericEditComponent } from '../../componentConfig';
import { IFormButtonComponent } from '../../../../types/global';
import { renderWithMockStore } from '../../../../testing/mocks';
import { ButtonComponent } from './ButtonComponent';
import { ComponentTypes } from '../../../';

// Test data:
const component: IFormButtonComponent = {
  id: '1',
  onClickAction: jest.fn(),
  type: ComponentTypes.Button,
};
const handleComponentChange = jest.fn();
const defaultProps: IGenericEditComponent = {
  component,
  handleComponentChange,
};

describe('ButtonComponent', () => {
  it('Renders without errors', () => {
    render();
  });
});

const render = (props?: Partial<IGenericEditComponent>) =>
  renderWithMockStore()(<ButtonComponent {...defaultProps} {...props} />);

