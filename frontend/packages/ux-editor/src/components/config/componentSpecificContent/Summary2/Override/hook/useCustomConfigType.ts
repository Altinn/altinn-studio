import { useTranslation } from 'react-i18next';

type CustomConfigType = {
  value: string;
  label: string;
};

export const useCustomConfigType = (): CustomConfigType[] => {
  const { t } = useTranslation();
  return [
    { value: 'list', label: t('ux_editor.component_properties.overrides_list') },
    { value: 'string', label: t('ux_editor.component_properties.overrides_string') },
    { value: 'notSet', label: t('ux_editor.component_properties.overrides_not_set') },
  ];
};
