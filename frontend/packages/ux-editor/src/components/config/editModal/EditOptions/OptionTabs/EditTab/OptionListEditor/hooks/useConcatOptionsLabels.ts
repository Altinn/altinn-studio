import type { Option } from 'app-shared/types/Option';
import type { TextResource } from '@studio/components-legacy';
import { useTranslation } from 'react-i18next';

export function useConcatOptionsLabels(
  optionsList: Option[],
  textResources?: TextResource[],
): string {
  const { t } = useTranslation();
  const labels: string[] = [];
  const optionLabels: string[] = optionsList.map((option: Option): string => option.label);
  const textResourceMap = new Map<string, string>();

  textResources?.forEach((resource: TextResource) => {
    if (resource.id) textResourceMap.set(resource.id, resource.value);
  });

  for (const label of optionLabels) {
    const translatedValue = textResourceMap.get(label);
    labels.push(translatedValue !== undefined ? translatedValue : label);
  }

  return labels.map((label: string) => `${label || t('general.empty_string')}`).join(' | ');
}
