import { useCallback, useEffect, useState } from 'react';

import type { ILayoutCollection } from 'src/layout/layout';

interface LayoutOverrideApi {
  changeLayouts: (mutator: (existingLayouts: ILayoutCollection) => ILayoutCollection) => void;
  resetLayouts: () => void;
}

const layoutOverrideApis: LayoutOverrideApi[] = [];
let windowLayoutOverridesInstalled = false;

export function useLayoutOverrides(bootstrapLayouts: ILayoutCollection | undefined) {
  const [overrideLayouts, setOverrideLayouts] = useState<ILayoutCollection | undefined>(undefined);

  const changeLayouts = useCallback(
    (mutator: (existingLayouts: ILayoutCollection) => ILayoutCollection) => {
      const existingLayouts = overrideLayouts ?? bootstrapLayouts;
      if (!existingLayouts) {
        throw new Error('Expected form bootstrap to exist before changing layouts');
      }

      setOverrideLayouts(mutator(structuredClone(existingLayouts)));
    },
    [bootstrapLayouts, overrideLayouts],
  );

  const resetLayouts = useCallback(() => {
    setOverrideLayouts(undefined);
  }, []);

  useEffect(() => {
    setOverrideLayouts(undefined);
  }, [bootstrapLayouts]);

  useEffect(() => {
    if (!windowLayoutOverridesInstalled) {
      window.changeLayouts = (mutator) => {
        const target = layoutOverrideApis.at(-1);
        if (!target) {
          throw new Error('Could not find an active FormProvider to change layouts for');
        }

        target.changeLayouts(mutator);
      };

      window.resetLayouts = () => {
        const target = layoutOverrideApis.at(-1);
        if (!target) {
          throw new Error('Could not find an active FormProvider to reset layouts for');
        }

        target.resetLayouts();
      };

      windowLayoutOverridesInstalled = true;
    }

    const api = { changeLayouts, resetLayouts };
    layoutOverrideApis.push(api);

    return () => {
      const idx = layoutOverrideApis.indexOf(api);
      if (idx !== -1) {
        layoutOverrideApis.splice(idx, 1);
      }
    };
  }, [changeLayouts, resetLayouts]);

  return overrideLayouts ?? bootstrapLayouts;
}
