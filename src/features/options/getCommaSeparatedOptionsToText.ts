import type { IUseLanguage } from 'src/hooks/useLanguage';
import type { IOption } from 'src/layout/common.generated';

export function getCommaSeparatedOptionsToText(value: string, optionList: IOption[], { langAsString }: IUseLanguage) {
  const split = value.split(',').filter((value) => !!value.trim());
  const out: { [key: string]: string } = {};
  split?.forEach((part) => {
    const textKey = optionList.find((option) => option.value === part)?.label || '';
    out[part] = langAsString(textKey) || part;
  });

  return out;
}
