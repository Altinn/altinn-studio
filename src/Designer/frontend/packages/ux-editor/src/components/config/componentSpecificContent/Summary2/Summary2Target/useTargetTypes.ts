import { useTranslation } from 'react-i18next';

type TargetType = {
  value: string;
  label: string;
};

export const useTargetTypes = (): TargetType[] => {
  const { t } = useTranslation();
  return [
    { value: 'page', label: t('general.page') },
    { value: 'component', label: t('general.component') },
    { value: 'layoutSet', label: t('general.layout_set') },
  ];
};
