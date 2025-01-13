import type { Option } from 'app-shared/types/Option';
import { useTranslation } from 'react-i18next';

export function useConcatOptionsLabels(optionsList: Option[]): string {
  const { t } = useTranslation();
  return optionsList
    .map((option: Option) => `${option.label || t('general.empty_string')}`)
    .join(' | ');
}
