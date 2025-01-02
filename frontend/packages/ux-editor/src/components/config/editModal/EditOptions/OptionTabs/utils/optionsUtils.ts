import { SelectedOptionsType } from '../../../../../../components/config/editModal/EditOptions/EditOptions';
import type { Option } from 'app-shared/types/Option';
import type { FormItem } from '../../../../../../types/FormItem';
import type { FormComponent, SelectionComponentType } from '../../../../../../types/FormComponent';
import type { FormContainer } from '../../../../../../types/FormContainer';
import { ObjectUtils } from '@studio/pure-functions';

export const componentUsesDynamicCodeList = (
  codeListId: string,
  optionListIds: string[],
): boolean => {
  if (!codeListId) {
    return false;
  }

  return !optionListIds.includes(codeListId);
};

export function getSelectedOptionsType(
  codeListId: string | undefined,
  options: Option[] | undefined,
  optionListIds: string[] = [],
): SelectedOptionsType {
  /** It is not permitted for a component to have both options and optionsId set on the same component. */
  if (options?.length && codeListId) {
    return SelectedOptionsType.Unknown;
  }

  return componentUsesDynamicCodeList(codeListId, optionListIds)
    ? SelectedOptionsType.ReferenceId
    : SelectedOptionsType.CodeList;
}

// Todo: Remove once featureFlag "optionListEditor" is removed.
export function getSelectedOptionsTypeWithManualSupport(
  codeListId: string | undefined,
  options: Option[] | undefined,
  optionListIds: string[] = [],
): SelectedOptionsType {
  /** It is not permitted for a component to have both options and optionsId set on the same component. */
  if (options?.length && codeListId) {
    return SelectedOptionsType.Unknown;
  }

  if (!!options) {
    return SelectedOptionsType.Manual;
  }

  return componentUsesDynamicCodeList(codeListId, optionListIds)
    ? SelectedOptionsType.ReferenceId
    : SelectedOptionsType.CodeList;
}

export function hasOptionListChanged(oldOptions: Option[], newOptions: Option[]): boolean {
  return JSON.stringify(oldOptions) !== JSON.stringify(newOptions);
}

export function handleOptionsChange(
  updatedComponent: FormItem<SelectionComponentType>,
  handleComponentChange: (item: FormContainer | FormComponent) => void,
): void {
  handleComponentChange(updatedComponent);
}

export function resetComponentOptions(
  component: FormItem<SelectionComponentType>,
): FormItem<SelectionComponentType> {
  const newComponent: FormItem<SelectionComponentType> = ObjectUtils.deepCopy(component);

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
  } else if (optionToKeep === 'options') {
    component.optionsId = undefined;
  }

  return component;
}
