import { useTranslation } from 'react-i18next';

export type CustomConfigType = {
  value: string;
  label: string;
};

export const useCustomConfigType = (): CustomConfigType[] => {
  const { t } = useTranslation();
  return [
    { value: 'string', label: t('ux_editor.component_properties.overrides_string') },
    { value: 'list', label: t('ux_editor.component_properties.overrides_list') },
    { value: 'notSet', label: t('ux_editor.component_properties.overrides_not_set') },
  ];
};
