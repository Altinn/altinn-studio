import { partiesAllowedToInstantiateQuery } from 'nextsrc/core/queries/parties/parties.queries';
import type { QueryClient } from '@tanstack/react-query';

export const partySelectionLoader = (queryClient: QueryClient) => () => {
  queryClient.ensureQueryData(partiesAllowedToInstantiateQuery());
  return null;
};
