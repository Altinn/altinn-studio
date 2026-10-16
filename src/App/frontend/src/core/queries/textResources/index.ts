import { useQuery } from '@tanstack/react-query';

import { useTextResourcesApi } from 'src/core/contexts/ApiProvider';
import { resourcesAsMap, textResourcesQuery } from 'src/core/queries/textResources/textResources.queries';
import type { TextResourcesApi } from 'src/core/api-client/textResources.api';
import type { ITextResourceResult, TextResourceMap } from 'src/features/language/textResources';

export interface UseTextResourcesQueryParams {
  selectedLanguage: string;
  textResourcesFromWindow: ITextResourceResult | undefined;
}

function useTextResourcesQuery(params: UseTextResourcesQueryParams) {
  const textResourcesApi = useTextResourcesApi();
  const { data, error } = useQuery(textResourcesQuery({ ...params, textResourcesApi }));
  return { data, error };
}

export interface TextResourcesQueries {
  ensureLoaded: (params: UseTextResourcesQueryParams & { textResourcesApi: TextResourcesApi }) => void;
  getCached: (selectedLanguage: string) => TextResourceMap | undefined;
}

export { resourcesAsMap, useTextResourcesQuery };
