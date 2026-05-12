import type { FormItem } from '../../../../../../types/FormItem';
import type { SelectionComponentType } from '../../../../../../types/FormComponent';
import { OptionsType } from '../enums/OptionsType';
import { isPublishedCodeListReferenceString } from './published-code-list-reference-utils';
import type { CodeListIdContextData } from '../types/CodeListIdContextData';

type ReadonlySelectionComponent = Readonly<FormItem<SelectionComponentType>>;

export function retrieveOptionsType(
  component: ReadonlySelectionComponent,
  codeListIdContextData: CodeListIdContextData,
): OptionsType | null {
  if (hasOptions(component) && hasNotEmptyOptionsId(component)) return null;
  if (hasOptions(component)) return OptionsType.Internal;
  if (hasNotEmptyOptionsId(component))
    return retrieveOptionsIdType(component.optionsId, codeListIdContextData);
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
  { idsFromAppLibrary, orgName }: CodeListIdContextData,
): OptionsType.FromAppLibrary | OptionsType.CustomId | OptionsType.Published {
  if (isPublishedCodeListReferenceString(optionsId, orgName)) return OptionsType.Published;
  else if (idsFromAppLibrary.includes(optionsId)) return OptionsType.FromAppLibrary;
  else return OptionsType.CustomId;
}
