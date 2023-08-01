import { useLanguage } from 'src/hooks/useLanguage';
import { useOptionList } from 'src/hooks/useOptionList';
import type { IUseLanguage } from 'src/hooks/useLanguage';
import type { ISelectionComponent } from 'src/layout/layout';
import type { IOption } from 'src/types';

/**
 * Utility function meant to convert multiple values for a multi-selection component to an object used in Summary
 *
 * Expected to be called from:
 * @see FormComponent.useDisplayData
 */
export function useCommaSeparatedOptionsToText(component: ISelectionComponent, value: string) {
  const langTools = useLanguage();
  const optionList = useOptionList(component);
  return getCommaSeparatedOptionsToText(value, optionList, langTools);
}

export function getCommaSeparatedOptionsToText(value: string, optionList: IOption[], { langAsString }: IUseLanguage) {
  const split = value.split(',').filter((value) => !!value.trim());
  const out: { [key: string]: string } = {};
  split?.forEach((part) => {
    const textKey = optionList.find((option) => option.value === part)?.label || '';
    out[part] = langAsString(textKey) || part;
  });

  return out;
}
