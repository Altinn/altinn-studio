import { useTranslation } from 'react-i18next';
import type { Option } from 'app-shared/types/Option';

export const useCodeListButtonValue = (options: Option[] | undefined): string | undefined => {
  const { t } = useTranslation();

  if (options?.length > 1) {
    return t('ux_editor.options.multiple', { value: options.length });
  } else if (options?.length === 1) {
    return t('ux_editor.options.single', { value: options.length });
  } else {
    return undefined;
  }
};
