import type { FormComponent } from '../../../../types/FormComponent';
import type { ComponentTypeV3 } from 'app-shared/types/ComponentTypeV3';

export function updateAutocomplete(
  component: FormComponent<ComponentTypeV3.Input>,
  autocomplete: string,
): FormComponent<ComponentTypeV3.Input> {
  if (autocomplete === '') return removeAutocomplete(component);
  else
    return {
      ...component,
      autocomplete,
    };
}

function removeAutocomplete(
  component: FormComponent<ComponentTypeV3.Input>,
): FormComponent<ComponentTypeV3.Input> {
  const { autocomplete, ...rest } = component;
  return rest;
}
