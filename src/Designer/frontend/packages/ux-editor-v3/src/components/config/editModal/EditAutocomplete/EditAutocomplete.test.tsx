import React from 'react';
import type { EditAutocompleteProps } from './index';
import { EditAutocomplete } from './index';
import type { RenderResult } from '@testing-library/react';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ComponentTypeV3 } from 'app-shared/types/ComponentTypeV3';
import type { FormComponent } from '../../../../types/FormComponent';
import { renderWithProviders } from '../../../../testing/mocks';

// Test data:
const component: FormComponent<ComponentTypeV3.Input> = {
  id: 'random-id',
  autocomplete: '',
  type: ComponentTypeV3.Input,
  itemType: 'COMPONENT',
  propertyPath: 'definitions/inputComponent',
  dataModelBindings: {},
};
const handleComponentChange = jest.fn();
const defaultProps: EditAutocompleteProps = {
  handleComponentChange,
  component,
};

describe('EditAutocomplete', () => {
  it('Calls handleComponentChange with the updated component when the value is changed ', async () => {
    const user = userEvent.setup();
    const optionToChoose = 'on';
    renderEditAutocomplete();

    const combobox = screen.getByRole('combobox');
    const option = screen.getByRole('option', { name: optionToChoose });
    await user.selectOptions(combobox, option);

    expect(handleComponentChange).toHaveBeenCalledWith({
      autocomplete: optionToChoose,
      dataModelBindings: {},
      id: 'random-id',
      itemType: 'COMPONENT',
      propertyPath: 'definitions/inputComponent',
      type: 'Input',
    });
  });

  it('Renders with the given autocomplete value as selected', () => {
    const selectedValue = 'on';
    const componentWithAutocomplete: FormComponent<ComponentTypeV3.Input> = {
      ...component,
      autocomplete: selectedValue,
    };
    renderEditAutocomplete({ component: componentWithAutocomplete });
    expect(screen.getByRole('combobox')).toHaveValue(selectedValue);
  });
});

function renderEditAutocomplete(props: Partial<EditAutocompleteProps> = {}): RenderResult {
  return renderWithProviders(<EditAutocomplete {...defaultProps} {...props} />);
}
