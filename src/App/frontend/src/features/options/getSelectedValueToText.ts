import type { IUseLanguage } from 'src/features/language/useLanguage';
import type { IOptionInternal } from 'src/features/options/castOptionsToStrings';

export function getSelectedValueToText(value: string, { langAsString }: IUseLanguage, optionList: IOptionInternal[]) {
  const label = optionList.find((option) => option.value === value)?.label;

  if (!label) {
    return value;
  }

  return langAsString(label) || value;
}
