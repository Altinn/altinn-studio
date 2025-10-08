import type { IUseLanguage } from 'src/features/language/useLanguage';
import type { IOptionInternal } from 'src/features/options/castOptionsToStrings';

export function getCommaSeparatedOptionsToText(
  value: string | undefined,
  optionList: IOptionInternal[],
  langAsString: IUseLanguage['langAsString'],
) {
  if (!value) {
    return {};
  }

  const split = value.split(',').filter((value) => !!value.trim());
  const out: { [key: string]: string } = {};
  split?.forEach((part) => {
    const textKey = optionList.find((option) => option.value === part)?.label || '';
    if (textKey) {
      out[part] = langAsString(textKey) || part;
    }
  });

  return out;
}
