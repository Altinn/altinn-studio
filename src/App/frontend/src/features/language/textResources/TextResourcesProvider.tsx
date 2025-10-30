import { useMemo } from 'react';
import type { PropsWithChildren } from 'react';

import { resourcesAsMap } from 'src/features/language/textResources/resourcesAsMap';
import type { TextResourceMap } from 'src/features/language/textResources/index';

export const useTextResources = (): TextResourceMap => {
  return useMemo(() => {
    const data = window.AltinnAppData?.textResources;
    if (!data) {
      return {};
    }
    return resourcesAsMap(data.resources);
  }, []);
};

export const useHasTextResources = () => true;

// Legacy export for backward compatibility
export const TextResourcesProvider = ({ children }: PropsWithChildren) => children;
