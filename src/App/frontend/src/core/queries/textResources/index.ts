import { useQuery } from '@tanstack/react-query';

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
  return useQuery(textResourcesQuery(params));
}

export { resourcesAsMap, textResourcesQuery, textResourcesQueryKeys, useTextResourcesQuery };
