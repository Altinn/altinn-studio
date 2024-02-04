import { useTranslation } from 'react-i18next';
import type { ComponentType } from 'app-shared/types/ComponentType';
import { useCallback } from 'react';

export function useComponentTypeName(): (type: ComponentType) => string {
  const { t } = useTranslation();
  return useCallback(
    (type: ComponentType) => {
      const key = `ux_editor.component_title.${type}`;
      const text = t(key);
      return text === key ? type : text;
    },
    [t],
  );
}
