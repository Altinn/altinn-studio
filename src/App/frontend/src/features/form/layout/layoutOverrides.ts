import { useEffect } from 'react';
import type { RefObject } from 'react';

import type { FormStoreApi } from 'src/features/form/FormContext';

const layoutOverrideStores: RefObject<FormStoreApi | undefined>[] = [];
let windowLayoutOverridesInstalled = false;

function getInnermostStore() {
  for (let i = layoutOverrideStores.length - 1; i >= 0; i--) {
    const store = layoutOverrideStores[i]?.current;
    if (store) {
      return store;
    }
  }

  return undefined;
}

/**
 * This hook manages the window.changeLayouts() function, which automatically accesses the innermost FormProvider and
 * exposes a function to change layouts. This is used by:
 *  - Cypress, in the cy.changeLayouts() command
 *  - Studio, when changing layouts in the UI editor preview
 *  - Our own LayoutInspector that lets you change layouts inside devtools
 */
export function useLayoutOverrides(storeRef: RefObject<FormStoreApi | undefined>) {
  useEffect(() => {
    if (!windowLayoutOverridesInstalled) {
      window.changeLayouts = (mutator) => {
        const target = getInnermostStore();
        if (!target) {
          throw new Error('Could not find an active FormProvider to change layouts for');
        }

        target.getState().bootstrap.changeLayouts(mutator);
      };

      window.resetLayouts = () => {
        const target = getInnermostStore();
        if (!target) {
          throw new Error('Could not find an active FormProvider to reset layouts for');
        }

        target.getState().bootstrap.resetLayouts();
      };

      windowLayoutOverridesInstalled = true;
    }

    layoutOverrideStores.push(storeRef);

    return () => {
      const idx = layoutOverrideStores.indexOf(storeRef);
      if (idx !== -1) {
        layoutOverrideStores.splice(idx, 1);
      }
    };
  }, [storeRef]);
}
