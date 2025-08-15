import React from 'react';
import { render, screen } from '@testing-library/react';
import { NewExpressionButton } from './NewExpressionButton';
import { textMock } from '@studio/testing/mocks/i18nMock';
import userEvent from '@testing-library/user-event';
import { FormItemContext } from '../../../../containers/FormItemContext';
import { ComponentType } from 'app-shared/types/ComponentType';
import type { FormComponent } from '../../../../types/FormComponent';
import type { KeyValuePairs } from 'app-shared/types/KeyValuePairs';
import type { FormItem } from '../../../../types/FormItem';

const user = userEvent.setup();

describe('NewExpressionButton', () => {
  afterEach(jest.clearAllMocks);

  const testComponents: KeyValuePairs<FormItem> = {
    'a paragraph element': {
      id: 'test',
      itemType: 'COMPONENT',
      type: ComponentType.Paragraph,
    },
    'an input element': {
      id: 'test',
      itemType: 'COMPONENT',
      type: ComponentType.Input,
      dataModelBindings: { simpleBinding: { field: 'some-path', dataType: '' } },
    },
    'a repeating group': {
      id: 'test',
      itemType: 'CONTAINER',
      type: ComponentType.RepeatingGroup,
      dataModelBindings: { group: { field: 'some-path', dataType: '' } },
      edit: {},
    },
  };

  it.each(Object.keys(testComponents))('Renders a dropdown menu for %s', async (key) => {
    const formItem = testComponents[key];
    renderAddButton({ formItem, formItemId: formItem.id });
    const button = screen.getByRole('button', { name: textMock('right_menu.expressions_add') });
    await user.click(button);
    screen.getByRole('dialog');
  });

  it('renders dropdown when button is clicked', async () => {
    renderAddButton();
    const addButton = screen.getByText(textMock('right_menu.expressions_add'));
    await user.click(addButton);
    const dropdown = screen.getByRole('dialog');
    expect(dropdown).toBeInTheDocument();
  });

  it('Calls handleUpdate with updated component when an expression is added', async () => {
    const handleUpdate = jest.fn();
    const formItem: FormComponent<ComponentType.Input> = {
      id: 'mockId',
      type: ComponentType.Input,
      dataModelBindings: { simpleBinding: { field: 'some-path', dataType: '' } },
      itemType: 'COMPONENT',
    };
    renderAddButton({ formItem, handleUpdate });

    const addButton = screen.getByText(textMock('right_menu.expressions_add'));
    await user.click(addButton);
    const dropdownOption = screen.getByRole('menuitem', {
      name: textMock('right_menu.expressions_property_read_only'),
    });
    await user.click(dropdownOption);

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
