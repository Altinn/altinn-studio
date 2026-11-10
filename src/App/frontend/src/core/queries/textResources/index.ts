import { useQuery } from '@tanstack/react-query';

import { useAppQueries } from 'src/core/queries/AppQueriesProvider';
import { resourcesAsMap, textResourcesQuery } from 'src/core/queries/textResources/textResources.queries';
import type { ITextResourceResult, TextResourceMap } from 'src/features/language/textResources';

export interface UseTextResourcesQueryParams {
  selectedLanguage: string;
  textResourcesFromWindow: ITextResourceResult | undefined;
}

function useTextResourcesQuery(params: UseTextResourcesQueryParams) {
  const textResourcesApi = useAppQueries();
  const { data, error } = useQuery(textResourcesQuery({ ...params, textResourcesApi }));
  return { data, error };
}

export interface TextResourcesQueries {
  ensureLoaded: (params: UseTextResourcesQueryParams) => void;
  getCached: (selectedLanguage: string) => TextResourceMap | undefined;
}

export { resourcesAsMap, useTextResourcesQuery };
