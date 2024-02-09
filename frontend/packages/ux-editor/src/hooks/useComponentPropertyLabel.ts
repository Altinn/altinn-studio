import { useTranslation } from 'react-i18next';
import { useCallback } from 'react';

export const useComponentPropertyLabel = () => {
  const { t } = useTranslation();
  return useCallback(
    (propertyKey: string) => {
      const translationKey: string = `ux_editor.component_properties.${propertyKey}`;
      return t([translationKey, propertyKey]);
    },
    [t],
  );
};
