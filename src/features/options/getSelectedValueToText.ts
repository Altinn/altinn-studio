import type { IUseLanguage } from 'src/features/language/useLanguage';
import type { IOption } from 'src/layout/common.generated';

export function getSelectedValueToText(value: string, { langAsString }: IUseLanguage, optionList: IOption[]) {
  const label = optionList.find((option) => option.value === value)?.label;

  if (!label) {
    return value;
  }

  return langAsString(label) || value;
}
