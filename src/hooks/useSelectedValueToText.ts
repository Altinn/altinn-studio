import { useAppSelector } from 'src/hooks/useAppSelector';
import { useOptionList } from 'src/hooks/useOptionList';
import { getTextResourceByKey } from 'src/language/sharedLanguage';
import type { ISelectionComponent } from 'src/layout/layout';

/**
 * Utility function meant to convert a value for a selection component to a label/text used in Summary
 *
 * Expected to be called from:
 * @see FormComponent.useDisplayData
 */
export function useSelectedValueToText(component: ISelectionComponent, value: string) {
  const textResources = useAppSelector((state) => state.textResources.resources);
  const optionList = useOptionList(component);
  const label = optionList.find((option) => option.value === value)?.label;

  if (!label) {
    return value;
  }

  return getTextResourceByKey(label, textResources) || value;
}
