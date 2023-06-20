import { useLanguage } from 'src/hooks/useLanguage';
import { useOptionList } from 'src/hooks/useOptionList';
import type { ISelectionComponent } from 'src/layout/layout';

/**
 * Utility function meant to convert a value for a selection component to a label/text used in Summary
 *
 * Expected to be called from:
 * @see FormComponent.useDisplayData
 */
export function useSelectedValueToText(component: ISelectionComponent, value: string) {
  const { langAsString } = useLanguage();
  const optionList = useOptionList(component);
  const label = optionList.find((option) => option.value === value)?.label;

  if (!label) {
    return value;
  }

  return langAsString(label) || value;
}
