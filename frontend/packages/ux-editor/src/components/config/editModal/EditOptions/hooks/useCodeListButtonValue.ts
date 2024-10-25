import { useTranslation } from 'react-i18next';
import { Option } from 'app-shared/types/Option';

export const useCodeListButtonValue = (options: Option[] | undefined) => {
  const { t } = useTranslation();

  if (options?.length > 1) {
    return options.length + ' ' + t('general.options').toLowerCase();
  } else if (options?.length > 0) {
    return options.length + ' ' + t('general.option').toLowerCase();
  } else {
    return undefined;
  }
};
