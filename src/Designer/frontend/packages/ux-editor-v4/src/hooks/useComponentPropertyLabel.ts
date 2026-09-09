import { useTranslation } from 'react-i18next';
import { useCallback } from 'react';

export const useComponentPropertyLabel = () => {
  const { t } = useTranslation();
  return useCallback(
    (propertyKey: string) => {
      const labelKey = propertyKey === 'timeStamp' ? 'timeStamp_v4' : propertyKey;
      const translationKey: string = `ux_editor.component_properties.${labelKey}`;
      return t([translationKey, propertyKey]);
    },
    [t],
  );
};
