import type { Option } from 'app-shared/types/Option';

export function isOptionsIdReferenceId(
  optionListIds: string[],
  optionsId: undefined | string,
): boolean {
  return !!optionsId && !isOptionsIdFromLibrary(optionListIds, optionsId);
}

export function isOptionsModifiable(
  optionListIds: string[],
  optionsId: undefined | string,
  options: undefined | Option[],
): boolean {
  return (!!optionsId && isOptionsIdFromLibrary(optionListIds, optionsId)) || !!options;
}

function isOptionsIdFromLibrary(optionListIds: string[], optionsId: undefined | string): boolean {
  return optionListIds.some((id: string) => id === optionsId);
}
