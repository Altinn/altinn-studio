import { SelectedOptionsType } from '../../../../../../components/config/editModal/EditOptions/EditOptions';
import type { IOption } from '../../../../../../types/global';
import type { Option } from 'app-shared/types/Option';
import type { CodeListType } from '@studio/components';

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
  options: IOption[] | undefined,
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

export const getOptionListValueType = (optionList: Option[]): CodeListType => {
  const firstValue = optionList?.[0]?.value;
  switch (typeof firstValue) {
    case 'string':
      return 'string';
    case 'number':
      return 'number';
    case 'boolean':
      return 'boolean';
    default:
      throw new Error('Unsupported type');
  }
};
