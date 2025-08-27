import { SelectedOptionsType } from '../../EditOptions';
import type { OptionList } from 'app-shared/types/OptionList';
import type { FormItem } from '../../../../../../types/FormItem';
import type { FormComponent, SelectionComponentType } from '../../../../../../types/FormComponent';
import type { FormContainer } from '../../../../../../types/FormContainer';
import { ObjectUtils } from 'libs/studio-pure-functions/src';

export function getSelectedOptionsType(
  codeListId: string | undefined,
  options: OptionList | undefined,
  optionListIds: string[] = [],
): SelectedOptionsType {
  /** It is not permitted for a component to have both options and optionsId set on the same component. */
  if (options?.length && codeListId) {
    return SelectedOptionsType.Unknown;
  }

  return isOptionsIdReferenceId(optionListIds, codeListId)
    ? SelectedOptionsType.ReferenceId
    : SelectedOptionsType.CodeList;
}

export function hasOptionListChanged(oldOptions: OptionList, newOptions: OptionList): boolean {
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
  let newComponent: FormItem<SelectionComponentType> = ObjectUtils.deepCopy(component);

  newComponent = clearOppositeOptionSetting(newComponent, 'optionsId');
  newComponent.optionsId = optionsId;

  return newComponent;
}

export function updateComponentOptions(
  component: FormItem<SelectionComponentType>,
  options: OptionList,
): FormItem<SelectionComponentType> {
  let newComponent: FormItem<SelectionComponentType> = ObjectUtils.deepCopy(component);

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

export function isOptionsIdReferenceId(
  optionListIds: string[],
  optionsId: undefined | string,
): boolean {
  return !!optionsId && !isOptionsIdFromLibrary(optionListIds, optionsId);
}

export function hasStaticOptionList(
  optionListIds: string[],
  { optionsId, options }: FormComponent<SelectionComponentType>,
): boolean {
  if (options) return true;
  return !!optionsId && isOptionsIdFromLibrary(optionListIds, optionsId);
}

function isOptionsIdFromLibrary(optionListIds: string[], optionsId: undefined | string): boolean {
  return optionListIds.some((id: string) => id.toLowerCase() === optionsId?.toLowerCase());
}
