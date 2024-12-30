import type {
  FormComponent,
  SelectionComponentType,
} from '../../../../../../../types/FormComponent';
import type { FormItem } from '../../../../../../../types/FormItem';
import type { FormContainer } from '../../../../../../../types/FormContainer';
import type { Option } from 'app-shared/types/Option';

export function handleOptionsChange(
  updatedComponent: FormItem<SelectionComponentType>,
  handleComponentChange: (item: FormContainer | FormComponent) => void,
): void {
  handleComponentChange(updatedComponent);
}

export function resetComponentOptions(
  component: FormItem<SelectionComponentType>,
): FormItem<SelectionComponentType> {
  const newComponent = { ...component };

  newComponent.optionsId = undefined;
  newComponent.options = undefined;

  return newComponent;
}

export function updateComponentOptionsId(
  component: FormItem<SelectionComponentType>,
  optionsId: string,
): FormItem<SelectionComponentType> {
  const newComponent = { ...component };

  clearOppositeOptionSetting(newComponent, 'optionsId');
  newComponent.optionsId = optionsId;

  return newComponent;
}

export function updateComponentOptions(
  component: FormItem<SelectionComponentType>,
  options: Option[],
): FormItem<SelectionComponentType> {
  const newComponent = { ...component };

  clearOppositeOptionSetting(newComponent, 'options');
  newComponent.options = options;

  return newComponent;
}

function clearOppositeOptionSetting(
  component: FormItem<SelectionComponentType>,
  optionToKeep: 'options' | 'optionsId',
) {
  if (optionToKeep === 'optionsId') {
    if (component.options) delete component.options;
  }
  if (optionToKeep === 'options') {
    if (component.optionsId) delete component.optionsId;
  }
}
