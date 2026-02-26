import type { FormItem } from '../../../../../../../types/FormItem';
import {
  createPublishedCodeListReferenceString,
  extractValuesFromPublishedCodeListReferenceString,
} from '../../utils/published-code-list-reference-utils';
import type { PublishedCodeListReferenceValues } from '../../types/PublishedCodeListReferenceValues';
import type { SelectionComponentType } from '../../../../../../../types/FormComponent';

export function extractPublishedCodeListNameFromComponent(
  component: FormItem<SelectionComponentType>,
): string {
  const referenceValues = extractValuesFromPublishedCodeListReferenceString(component.optionsId);
  return referenceValues?.codeListName || '';
}

export function extractPublishedCodeListVersionFromComponent(
  component: FormItem<SelectionComponentType>,
): string {
  const referenceValues = extractValuesFromPublishedCodeListReferenceString(component.optionsId);
  return referenceValues?.version || '';
}

export function updatePublishedCodeListReferenceInComponent(
  component: FormItem<SelectionComponentType>,
  values: PublishedCodeListReferenceValues,
): FormItem<SelectionComponentType> {
  const newId = createPublishedCodeListReferenceString(values);
  return {
    ...component,
    optionsId: newId,
    options: undefined,
  };
}
