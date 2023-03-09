import { useAppSelector } from 'src/common/hooks/useAppSelector';
import { useOptionList } from 'src/common/hooks/useOptionList';
import { getTextResourceByKey } from 'src/language/sharedLanguage';
import type { ISelectionComponent } from 'src/layout/layout';

/**
 * Utility function meant to convert multiple values for a multi-selection component to an object used in Summary
 *
 * Expected to be called from:
 * @see FormComponent.useDisplayData
 */
export function useCommaSeparatedOptionsToText(component: ISelectionComponent, value: string) {
  const textResources = useAppSelector((state) => state.textResources.resources);
  const optionList = useOptionList(component);
  const split = value.split(',');
  const out: { [key: string]: string } = {};
  split?.forEach((part) => {
    const textKey = optionList.find((option) => option.value === part)?.label || '';
    out[part] = getTextResourceByKey(textKey, textResources) || part;
  });

  return out;
}
