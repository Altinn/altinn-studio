import { partiesAllowedToInstantiateQuery } from 'nextsrc/core/queries/parties';
import type { QueryClient } from '@tanstack/react-query';

export const partySelectionLoader = (queryClient: QueryClient) => () => {
  queryClient.ensureQueryData(partiesAllowedToInstantiateQuery);
  return null;
};
