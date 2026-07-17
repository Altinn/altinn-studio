import { useMemo } from 'react';

import { useQuery, useQueryClient } from '@tanstack/react-query';

import { useTextResourcesApi } from 'src/core/contexts/ApiProvider';
import {
  resourcesAsMap,
  textResourcesQuery,
  textResourcesQueryKeys,
} from 'src/core/queries/textResources/textResources.queries';
import type { TextResourcesApi } from 'src/core/api-client/textResources.api';
import type { ITextResourceResult, TextResourceMap } from 'src/features/language/textResources';

interface UseTextResourcesQueryParams {
  selectedLanguage: string;
  textResourcesFromWindow: ITextResourceResult | undefined;
}

function useTextResourcesQuery(params: UseTextResourcesQueryParams) {
  const textResourcesApi = useTextResourcesApi();
  return useQuery(textResourcesQuery({ ...params, textResourcesApi }));
}

export interface TextResourcesQueries {
  ensureLoaded: (params: UseTextResourcesQueryParams & { textResourcesApi: TextResourcesApi }) => void;
  getCached: (selectedLanguage: string) => TextResourceMap | undefined;
}

function useTextResourcesQueries(): TextResourcesQueries {
  const queryClient = useQueryClient();
  return useMemo(
    () => ({
      ensureLoaded: ({ selectedLanguage, textResourcesFromWindow, textResourcesApi }) => {
        if (queryClient.getQueryData(textResourcesQueryKeys.textResources(selectedLanguage))) {
          return;
        }
        void queryClient
          .ensureQueryData(textResourcesQuery({ selectedLanguage, textResourcesFromWindow, textResourcesApi }))
          .catch(() => undefined);
      },
      getCached: (selectedLanguage) =>
        queryClient.getQueryData<TextResourceMap>(textResourcesQueryKeys.textResources(selectedLanguage)),
    }),
    [queryClient],
  );
}

export { resourcesAsMap, textResourcesQuery, textResourcesQueryKeys, useTextResourcesQueries, useTextResourcesQuery };
