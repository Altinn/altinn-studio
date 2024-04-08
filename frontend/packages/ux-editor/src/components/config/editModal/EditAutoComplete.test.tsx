import React from 'react';
import { EditAutoComplete } from './EditAutoComplete';
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ComponentType } from 'app-shared/types/ComponentType';
import type { FormComponent } from '../../../types/FormComponent';
import type { FormItem } from '../../../types/FormItem';
import { HTMLAutoCompleteValue } from 'app-shared/types/HTMLAutoCompleteValue';

const componentMock: FormComponent<ComponentType.Input> = {
  id: 'random-id',
  autocomplete: undefined,
  type: ComponentType.Input,
  itemType: 'COMPONENT',
  propertyPath: 'definitions/inputComponent',
  dataModelBindings: { simpleBinding: '' },
};

export const renderEditAutocomplete = (
  handleComponentChangeMock: (component: FormItem<ComponentType.Input>) => void = jest.fn(),
  component: FormItem<ComponentType.Input> = componentMock,
) =>
  render(
    <EditAutoComplete handleComponentChange={handleComponentChangeMock} component={component} />,
  );

describe('EditAutoComplete', () => {
  it('Renders with the "default" option as selected by default', () => {
    renderEditAutocomplete();
    const combobox = screen.getByRole('combobox');
    expect(combobox).toHaveValue('');
  });

  it('Updates the component with the chosen value', async () => {
    const user = userEvent.setup();
    const handleComponentChange = jest.fn();
    renderEditAutocomplete(handleComponentChange);
    const combobox = screen.getByRole('combobox');
    await act(() => user.selectOptions(combobox, 'name'));
    expect(handleComponentChange).toHaveBeenCalledTimes(1);
    expect(handleComponentChange).toHaveBeenCalledWith({
      ...componentMock,
      autocomplete: 'name',
    });
  });

  it('Renders with the given value', () => {
    const autocomplete = HTMLAutoCompleteValue.Name;
    renderEditAutocomplete(jest.fn(), { ...componentMock, autocomplete });
    const combobox = screen.getByRole('combobox');
    expect(combobox).toHaveValue(autocomplete);
  });

  it('Sets autocomplete to undefined when the "default" option is selected', async () => {
    const autocomplete = HTMLAutoCompleteValue.Name;
    const handleComponentChange = jest.fn();
    const user = userEvent.setup();
    renderEditAutocomplete(handleComponentChange, { ...componentMock, autocomplete });
    const combobox = screen.getByRole('combobox');
    await act(() => user.selectOptions(combobox, ''));
    expect(handleComponentChange).toHaveBeenCalledTimes(1);
    expect(handleComponentChange).toHaveBeenLastCalledWith({
      ...componentMock,
      autocomplete: undefined,
    });
  });
});
