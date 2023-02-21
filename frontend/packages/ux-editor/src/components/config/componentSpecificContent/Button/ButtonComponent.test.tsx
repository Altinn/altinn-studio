import React from 'react';
import { act, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { IGenericEditComponent } from '../../componentConfig';
import { IFormButtonComponent } from '../../../../types/global';
import { renderWithMockStore } from '../../../../testing/mocks';
import { ButtonComponent } from './ButtonComponent';
import { ComponentTypes } from '../../../';
import { mockUseTranslation } from '../../../../../../../testing/mocks/i18nMock';

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

// Mocks:
jest.mock(
  'react-i18next',
  () => ({ useTranslation: () => mockUseTranslation() }),
);

describe('ButtonComponent', () => {
  it('Renders without errors', () => {
    render();
  });

  it('changing button type to navigation buttons should call handleComponentChange with expected properties', async () => {
    const mockHandleComponentChange = jest.fn();
    const { user } = render({ handleComponentChange: mockHandleComponentChange });
    const buttonTypeSelect = screen.getByRole('combobox');
    await act(() => user.click(buttonTypeSelect));
    await act(() => user.click(screen.getAllByRole('option')[1]));
    expect(mockHandleComponentChange).toHaveBeenCalledWith({
      ...component,
      type: 'NavigationButtons',
      showBackButton: true,
      textResourceBindings: {
        next: 'next',
        back: 'back',
      },
    });
  });

  it('changing button type to submit should call handleComponentChange with expected properties', async () => {
    const mockHandleComponentChange = jest.fn();
    const { user } = render({
      handleComponentChange: mockHandleComponentChange,
      component: {
        ...component,
        type: 'NavigationButtons',
      },
    });
    const buttonTypeSelect = screen.getByRole('combobox');
    await act(() => user.click(buttonTypeSelect));
    await act(() => user.click(screen.getAllByRole('option')[0]));
    expect(mockHandleComponentChange).toHaveBeenCalledWith({
      ...component,
      type: 'Button',
      textResourceBindings: {
        title: 'ux_editor.modal_properties_button_type_submit',
      },
    });
  });
});

const render = (props?: Partial<IGenericEditComponent>) => {
  const user = userEvent.setup();
  renderWithMockStore()(<ButtonComponent {...defaultProps} {...props} />);
  return { user };
};
