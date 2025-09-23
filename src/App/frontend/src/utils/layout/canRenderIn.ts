import { useCallback } from 'react';

import { useLayoutLookups } from 'src/features/form/layout/LayoutsContext';
import { getComponentCapabilities } from 'src/layout';
import type { CompCapabilities } from 'src/codegen/Config';

export function useHasCapability(capability: keyof CompCapabilities) {
  const lookups = useLayoutLookups();

  return useCallback(
    (componentId: string | undefined) => {
      if (!componentId) {
        return false;
      }
      const component = lookups.allComponents[componentId];
      if (!component) {
        return false;
      }
      const capabilities = getComponentCapabilities(component.type);
      return capabilities[capability];
    },
    [lookups, capability],
  );
}
