import type { IUseLanguage } from 'src/hooks/useLanguage';
import type { IOption } from 'src/layout/common.generated';

export function getSelectedValueToText(value: string, { langAsString }: IUseLanguage, optionList: IOption[]) {
  const label = optionList.find((option) => option.value === value)?.label;

  if (!label) {
    return value;
  }

  return langAsString(label) || value;
}
