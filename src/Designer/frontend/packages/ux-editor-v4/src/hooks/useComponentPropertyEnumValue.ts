import { useTranslation } from 'react-i18next';
import { useCallback } from 'react';

export const useComponentPropertyEnumValue = () => {
  const { t } = useTranslation();
  return useCallback(
    (value: string) => {
      const translationKey: string = `ux_editor.component_properties.enum_${value}`;
      const translation = t(translationKey);
      return translation === translationKey ? value : translation;
    },
    [t],
  );
};
