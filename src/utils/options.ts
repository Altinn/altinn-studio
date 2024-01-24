import type { IOptionInternal } from 'src/features/options/castOptionsToStrings';

export function duplicateOptionFilter(
  currentOption: IOptionInternal,
  currentIndex: number,
  options: IOptionInternal[],
): boolean {
  for (let i = 0; i < currentIndex; i++) {
    if (currentOption.value === options[i].value) {
      return false;
    }
  }
  return true;
}
