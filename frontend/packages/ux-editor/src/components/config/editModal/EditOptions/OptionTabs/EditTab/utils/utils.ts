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
  let newComponent: FormItem<SelectionComponentType> = { ...component };

  newComponent = clearOppositeOptionSetting(newComponent, 'optionsId');
  newComponent.optionsId = optionsId;

  return newComponent;
}

export function updateComponentOptions(
  component: FormItem<SelectionComponentType>,
  options: Option[],
): FormItem<SelectionComponentType> {
  let newComponent: FormItem<SelectionComponentType> = { ...component };

  newComponent = clearOppositeOptionSetting(newComponent, 'options');
  newComponent.options = options;

  return newComponent;
}

function clearOppositeOptionSetting(
  component: FormItem<SelectionComponentType>,
  optionToKeep: 'options' | 'optionsId',
) {
  if (optionToKeep === 'optionsId') {
    component.options = undefined;
  }
  if (optionToKeep === 'options') {
    component.optionsId = undefined;
  }
  return component;
}
