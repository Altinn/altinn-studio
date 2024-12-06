import { useTranslation } from 'react-i18next';
import type { ComponentTypeV3 } from 'app-shared/types/ComponentTypeV3';
import { useCallback } from 'react';

export function useComponentTypeName(): (type: ComponentTypeV3) => string {
  const { t } = useTranslation();
  return useCallback(
    (type: ComponentTypeV3) => {
      const key = `ux_editor.component_title.${type}`;
      const text = t(key);
      return text === key ? type : text;
    },
    [t],
  );
}
