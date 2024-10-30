import { SelectedOptionsType } from '../components/config/editModal/EditOptions/EditOptions';
import type { IOption } from '../types/global';

/**
 * Function that determines if a component uses a dynamic code list with reference id
 * @param codelistId The code list id.
 * @param optionListIds The list of available static code list ids.
 * @returns True if the code list id is set and is not in the list of static code list ids, false otherwise.
 */
export const componentUsesDynamicCodeList = (
  codelistId: string,
  optionListIds: string[],
): boolean => {
  if (!codelistId) {
    return false;
  }

  return !optionListIds.includes(codelistId);
};

/**
 * Function that determines the selected options type based on the provided parameters.
 * @param codeListId The code list id (if it exists).
 * @param options The list of manual options (if it exists).
 * @param optionListIds The list of available code list ids.
 * @returns The selected options type - either Manual, CodeList, ReferenceId or Unknown.
 */
export function getSelectedOptionsType(
  codeListId: string | undefined,
  options: IOption[] | undefined,
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

/**
 * Function that returns the property key for the selected options type.
 * @param selectedOptionsType The selected options type.
 * @returns The property key for the selected options type.
 */
export function getOptionsPropertyKey(selectedOptionsType: SelectedOptionsType) {
  switch (selectedOptionsType) {
    case SelectedOptionsType.CodeList:
    case SelectedOptionsType.ReferenceId:
      return 'optionsId';
    case SelectedOptionsType.Manual:
    default:
      return 'options';
  }
}
