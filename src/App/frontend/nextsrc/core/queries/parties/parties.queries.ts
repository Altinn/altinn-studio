import { queryOptions } from '@tanstack/react-query';
import { PartiesApi } from 'nextsrc/core/apiClient/partiesApi';

export const partyQueryKeys = {
  all: ['parties'] as const,
  allowedToInstantiate: () => [...partyQueryKeys.all, 'allowedToInstantiate'],
};

export const partiesAllowedToInstantiateQuery = queryOptions({
  queryKey: ['parties', 'allowedToInstantiate'],
  queryFn: () => PartiesApi.getPartiesAllowedToInstantiateHierarchical(),
  staleTime: 1000 * 60,
});
