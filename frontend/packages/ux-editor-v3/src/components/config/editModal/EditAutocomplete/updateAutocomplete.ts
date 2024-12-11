import type { FormComponent } from '../../../../types/FormComponent';
import type { ComponentTypeV3 } from 'app-shared/types/ComponentTypeV3';

export function updateAutocomplete(
  component: FormComponent<ComponentTypeV3.Input>,
  autocomplete: string,
): FormComponent<ComponentTypeV3.Input> {
  return {
    ...component,
    autocomplete,
  };
}
