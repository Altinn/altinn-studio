import { useQuery } from '@tanstack/react-query';

import { useTextResourcesApi } from 'src/core/contexts/ApiProvider';
import {
  resourcesAsMap,
  textResourcesQuery,
  textResourcesQueryKeys,
} from 'src/core/queries/textResources/textResources.queries';
import type { ITextResourceResult } from 'src/features/language/textResources';

interface UseTextResourcesQueryParams {
  selectedLanguage: string;
  textResourcesFromWindow: ITextResourceResult | undefined;
}

function useTextResourcesQuery(params: UseTextResourcesQueryParams) {
  const textResourcesApi = useTextResourcesApi();
  return useQuery(textResourcesQuery({ ...params, textResourcesApi }));
}

export { resourcesAsMap, textResourcesQuery, textResourcesQueryKeys, useTextResourcesQuery };
