import { useTranslation } from 'react-i18next';
import { useCallback } from 'react';

export const useComponentPropertyDescription = () => {
  const { t } = useTranslation();
  return useCallback(
    (propertyKey: string) => {
      const translationKey: string = `ux_editor.component_properties_description.${propertyKey}`;
      const translation = t(translationKey);
      return translation === translationKey ? undefined : translation;
    },
    [t],
  );
};
