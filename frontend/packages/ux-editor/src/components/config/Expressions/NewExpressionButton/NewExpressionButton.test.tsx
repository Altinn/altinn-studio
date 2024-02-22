import React from 'react';
import { act, render, screen } from '@testing-library/react';
import { NewExpressionButton } from './NewExpressionButton';
import { textMock } from '../../../../../../../testing/mocks/i18nMock';
import userEvent from '@testing-library/user-event';
import { FormItemContext } from '../../../../containers/FormItemContext';
import { ComponentType } from 'app-shared/types/ComponentType';
import type { FormComponent } from '../../../../types/FormComponent';

const user = userEvent.setup();

describe('NewExpressionButton', () => {
  afterEach(jest.clearAllMocks);

  it('renders add expression button by default', () => {
    renderAddButton();
    const addButton = screen.getByText(textMock('right_menu.expressions_add'));
    expect(addButton).toBeInTheDocument();
  });

  it('renders dropdown when button is clicked', async () => {
    renderAddButton();
    const addButton = screen.getByText(textMock('right_menu.expressions_add'));
    await act(() => user.click(addButton));
    const dropdown = screen.getByRole('dialog');
    expect(dropdown).toBeInTheDocument();
  });

  it('Calls handleUpdate with updated component when an expression is added', async () => {
    const handleUpdate = jest.fn();
    const formItem: FormComponent<ComponentType.Input> = {
      id: 'mockId',
      type: ComponentType.Input,
      itemType: 'COMPONENT',
    };
    renderAddButton({ formItem, handleUpdate });

    const addButton = screen.getByText(textMock('right_menu.expressions_add'));
    await act(() => user.click(addButton));
    const dropdownOption = screen.getByRole('menuitem', {
      name: textMock('right_menu.expressions_property_read_only'),
    });
    await act(() => user.click(dropdownOption));

    expect(handleUpdate).toHaveBeenCalledTimes(1);
    expect(handleUpdate).toHaveBeenCalledWith({ ...formItem, readOnly: null });
  });
});

const renderAddButton = (formItemContext = {}) => {
  const defaultFormItemContext: FormItemContext = {
    formItem: {
      id: 'mockId',
      type: ComponentType.Paragraph,
      itemType: 'COMPONENT',
    },
    handleSave: jest.fn(),
    handleUpdate: jest.fn(),
    formItemId: 'mockId',
    handleDiscard: jest.fn(),
    handleEdit: jest.fn(),
    debounceSave: jest.fn(),
  };
  const completeContext = { ...defaultFormItemContext, ...formItemContext };
  return render(
    <FormItemContext.Provider value={completeContext}>
      <NewExpressionButton />
    </FormItemContext.Provider>,
  );
};
