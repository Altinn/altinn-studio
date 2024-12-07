import { useTranslation } from 'react-i18next';
import { useCallback } from 'react';

export const useComponentPropertyHelpText = () => {
  const { t } = useTranslation();

  return useCallback(
    (propertyKey: string): string | undefined => {
      const translationKey: string = `ux_editor.component_properties_help_text.${propertyKey}`;
      const translation = t(translationKey);

      return translation !== translationKey ? translation : undefined;
    },
    [t],
  );
};
