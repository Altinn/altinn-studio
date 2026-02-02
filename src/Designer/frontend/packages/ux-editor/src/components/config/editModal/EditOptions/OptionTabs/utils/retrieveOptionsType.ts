import type { FormItem } from '../../../../../../types/FormItem';
import type { SelectionComponentType } from '../../../../../../types/FormComponent';
import { OptionsType } from '../enums/OptionsType';

type ReadonlySelectionComponent = Readonly<FormItem<SelectionComponentType>>;

export function retrieveOptionsType(
  component: ReadonlySelectionComponent,
  optionListIdsFromLibrary: string[],
): OptionsType | null {
  if (hasOptions(component) && hasNotEmptyOptionsId(component)) return null;
  if (hasOptions(component)) return OptionsType.Internal;
  if (hasNotEmptyOptionsId(component))
    return retrieveOptionsIdType(component.optionsId, optionListIdsFromLibrary);
  return null;
}

function hasNotEmptyOptionsId(
  component: ReadonlySelectionComponent,
): component is ReadonlySelectionComponent & {
  optionsId: string;
} {
  return (
    'optionsId' in component &&
    typeof component.optionsId === 'string' &&
    component.optionsId.length > 0
  );
}

function hasOptions(
  component: ReadonlySelectionComponent,
): component is ReadonlySelectionComponent & {
  [K in 'options']-?: ReadonlySelectionComponent[K];
} {
  return 'options' in component && Array.isArray(component.options);
}

function retrieveOptionsIdType(
  optionsId: string,
  optionListIdsFromLibrary: string[],
): OptionsType.FromAppLibrary | OptionsType.CustomId {
  return optionListIdsFromLibrary.includes(optionsId)
    ? OptionsType.FromAppLibrary
    : OptionsType.CustomId;
}
