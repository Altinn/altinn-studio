import { useEffect } from 'react';

import { useQuery } from '@tanstack/react-query';
import { uuidv4 } from 'zod';

import { useAppQueries } from 'src/core/contexts/AppQueriesProvider';
export function useLayoutSetsQueryDef() {
  const { fetchLayoutSets } = useAppQueries();
  return {
    queryKey: ['fetchLayoutSets'],
    queryFn: async () => {
      const layoutSets = await fetchLayoutSets();
      if (layoutSets?.uiSettings?.taskNavigation) {
        return {
          ...layoutSets,
          uiSettings: {
            ...layoutSets.uiSettings,
            taskNavigation: layoutSets.uiSettings.taskNavigation.map((g) => ({ ...g, id: uuidv4() })),
          },
        };
      }
      return layoutSets;
    },
  };
}

export const useLayoutSetsQuery = () => {
  const utils = useQuery(useLayoutSetsQueryDef());

  useEffect(() => {
    utils.error && window.logError('Fetching layout sets failed:\n', utils.error);
  }, [utils.error]);

  return utils;
};
