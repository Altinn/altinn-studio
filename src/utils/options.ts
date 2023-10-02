import type { IOption } from 'src/layout/common.generated';

export function duplicateOptionFilter(currentOption: IOption, currentIndex: number, options: IOption[]): boolean {
  for (let i = 0; i < currentIndex; i++) {
    if (currentOption.value === options[i].value) {
      return false;
    }
  }
  return true;
}
