import type { LoaderFunctionArgs } from 'react-router';

import { partiesAllowedToInstantiateHierarchicalQuery } from 'nextsrc/core/apiClient/partiesApi';
import { queryClient } from 'nextsrc/QueryClient';

export const partySelectionLoader = async (_args: LoaderFunctionArgs) => {
  await queryClient.ensureQueryData(partiesAllowedToInstantiateHierarchicalQuery);
  return null;
};
