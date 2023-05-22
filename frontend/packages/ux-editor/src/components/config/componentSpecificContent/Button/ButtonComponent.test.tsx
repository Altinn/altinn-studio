import React from 'react';
import { act, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { IGenericEditComponent } from '../../componentConfig';
import { renderWithMockStore } from '../../../../testing/mocks';
import { ButtonComponent } from './ButtonComponent';
import { ComponentType } from '../../../';
import { textMock } from '../../../../../../../testing/mocks/i18nMock';
import type { FormButtonComponent } from '../../../../types/FormComponent';

// Test data:
const component: FormButtonComponent = {
  id: '1',
  onClickAction: jest.fn(),
  type: ComponentType.Button,
  itemType: 'COMPONENT',
  dataModelBindings: {},
};
const handleComponentChange = jest.fn();
const defaultProps: IGenericEditComponent = {
  component,
  handleComponentChange,
};

describe('ButtonComponent', () => {
  it('changing button type to navigation buttons should call handleComponentChange with expected properties', async () => {
    const mockHandleComponentChange = jest.fn();
    const { user } = render({ handleComponentChange: mockHandleComponentChange });
    const buttonTypeSelect = screen.getByRole('combobox');
    await act(() => user.click(buttonTypeSelect));
    await act(() => user.click(screen.getAllByRole('option')[1]));
    expect(mockHandleComponentChange).toHaveBeenCalledWith({
      ...component,
      type: ComponentType.NavigationButtons,
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
        type: ComponentType.NavigationButtons,
      },
    });
    const buttonTypeSelect = screen.getByRole('combobox');
    await act(() => user.click(buttonTypeSelect));
    await act(() => user.click(screen.getAllByRole('option')[0]));
    expect(mockHandleComponentChange).toHaveBeenCalledWith({
      ...component,
      type: ComponentType.Button,
      textResourceBindings: {
        title: textMock('ux_editor.modal_properties_button_type_submit'),
      },
    });
  });
});

const render = (props?: Partial<IGenericEditComponent>) => {
  const user = userEvent.setup();
  renderWithMockStore()(<ButtonComponent {...defaultProps} {...props} />);
  return { user };
};
