import type { OptionList } from 'app-shared/types/OptionList';
import type { FormItem } from '../../../../../../types/FormItem';
import type { FormComponent, SelectionComponentType } from '../../../../../../types/FormComponent';
import type { FormContainer } from '../../../../../../types/FormContainer';
import { retrieveOptionsType } from './retrieveOptionsType';
import { OptionsType } from '../enums/OptionsType';
import { OptionsTabKey } from '../enums/OptionsTabKey';
import type { CodeListIdContextData } from '../types/CodeListIdContextData';

export function determineInitialTab(
  component: Readonly<FormItem<SelectionComponentType>>,
  codeListIdContextData: CodeListIdContextData,
): OptionsTabKey {
  const type = retrieveOptionsType(component, codeListIdContextData);
  return type === OptionsType.CustomId ? OptionsTabKey.Reference : OptionsTabKey.CodeList;
}

export function hasOptionListChanged(oldOptions: OptionList, newOptions: OptionList): boolean {
  return JSON.stringify(oldOptions) !== JSON.stringify(newOptions);
}

export function handleOptionsChange(
  updatedComponent: Readonly<FormItem<SelectionComponentType>>,
  handleComponentChange: (item: FormContainer | FormComponent) => void,
): void {
  handleComponentChange(updatedComponent);
}

export function resetComponentOptions(
  component: Readonly<FormItem<SelectionComponentType>>,
): FormItem<SelectionComponentType> {
  return { ...component, optionsId: undefined, options: undefined };
}

export function updateComponentOptionsId(
  component: Readonly<FormItem<SelectionComponentType>>,
  optionsId: string,
): FormItem<SelectionComponentType> {
  return { ...component, optionsId, options: undefined };
}

export function updateComponentOptions(
  component: Readonly<FormItem<SelectionComponentType>>,
  options: OptionList,
): FormItem<SelectionComponentType> {
  return { ...component, optionsId: undefined, options };
}

export function isOptionsIdReferenceId(
  optionListIdsFromLibrary: string[],
  optionsId: undefined | string,
): boolean {
  return !!optionsId && !isOptionsIdInList(optionListIdsFromLibrary, optionsId);
}

export function hasStaticOptionList(
  codeListIdContextData: CodeListIdContextData,
  component: FormComponent<SelectionComponentType>,
): boolean {
  const type = retrieveOptionsType(component, codeListIdContextData);
  return type === OptionsType.Internal || type === OptionsType.FromAppLibrary;
}

function isOptionsIdInList(optionListIds: string[], optionsId: undefined | string): boolean {
  return optionListIds.some((id: string) => id.toLowerCase() === optionsId?.toLowerCase());
}

export function hasEditableOptionList(
  component: FormComponent<SelectionComponentType>,
  codeListIdContextData: CodeListIdContextData,
): boolean {
  const type = retrieveOptionsType(component, codeListIdContextData);
  return type !== null && type !== OptionsType.CustomId;
}
