import { useTranslation } from 'react-i18next';
import { useCallback } from 'react';
import type { PropertyDefinition } from '@app/layout-contract';

export const useComponentPropertyDescription = () => {
  const { t, i18n } = useTranslation();
  return useCallback(
    (propertyKey: string, definition?: PropertyDefinition) => {
      const translationKey: string = `ux_editor.component_properties_description.${propertyKey}`;
      const translation = t(translationKey);
      if (translation !== translationKey) return translation;

      const language = i18n.language?.split('-')[0];
      const generatedDescription = definition?.description?.[language === 'nb' ? 'nb' : 'en'];
      return generatedDescription;
    },
    [i18n.language, t],
  );
};
