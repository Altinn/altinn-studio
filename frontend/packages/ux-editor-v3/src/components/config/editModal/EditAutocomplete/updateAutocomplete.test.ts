import { ComponentTypeV3 } from 'app-shared/types/ComponentTypeV3';
import type { FormComponent } from '../../../../types/FormComponent';
import { updateAutocomplete } from './updateAutocomplete';

describe('updateAutocomplete', () => {
  it('Updates the autocomplete value of the given component', () => {
    const component: FormComponent<ComponentTypeV3.Input> = {
      id: 'test',
      type: ComponentTypeV3.Input,
      autocomplete: 'off',
      itemType: 'COMPONENT',
      dataModelBindings: {},
    };
    const newAutocomplete = 'on';
    const result = updateAutocomplete(component, newAutocomplete);
    expect(result).toEqual({
      ...component,
      autocomplete: newAutocomplete,
    });
  });
});
