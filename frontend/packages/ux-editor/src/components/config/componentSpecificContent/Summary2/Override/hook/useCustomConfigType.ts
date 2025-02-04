import { useTranslation } from 'react-i18next';

export type CustomConfigType = {
  value: string;
  label: string;
};

export const useCustomConfigType = (): CustomConfigType[] => {
  const { t } = useTranslation();
  return [
    {
      value: 'notSet',
      label: t('ux_editor.component_properties.summary.override.display_type.not_set'),
    },
    {
      value: 'string',
      label: t('ux_editor.component_properties.summary.override.display_type.string'),
    },
    {
      value: 'list',
      label: t('ux_editor.component_properties.summary.override.display_type.list'),
    },
  ];
};
