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

  for (const label of optionLabels) {
    const textResource: TextResource = textResources?.find(
      (resource: TextResource) => resource.id === label,
    );

    if (textResource) {
      labels.push(textResource.value);
    } else {
      labels.push(label);
    }
  }

  return labels.map((label: string) => `${label || t('general.empty_string')}`).join(' | ');
}
