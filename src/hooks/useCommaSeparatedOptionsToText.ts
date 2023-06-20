import { useLanguage } from 'src/hooks/useLanguage';
import { useOptionList } from 'src/hooks/useOptionList';
import type { ISelectionComponent } from 'src/layout/layout';

/**
 * Utility function meant to convert multiple values for a multi-selection component to an object used in Summary
 *
 * Expected to be called from:
 * @see FormComponent.useDisplayData
 */
export function useCommaSeparatedOptionsToText(component: ISelectionComponent, value: string) {
  const { langAsString } = useLanguage();
  const optionList = useOptionList(component);
  const split = value.split(',').filter((value) => !!value.trim());
  const out: { [key: string]: string } = {};
  split?.forEach((part) => {
    const textKey = optionList.find((option) => option.value === part)?.label || '';
    out[part] = langAsString(textKey) || part;
  });

  return out;
}
