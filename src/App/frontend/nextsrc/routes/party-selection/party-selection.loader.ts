import { redirect } from 'react-router-dom';
import type { LoaderFunctionArgs } from 'react-router-dom';

import { GlobalData } from 'nextsrc/core/globalData';
import { partiesAllowedToInstantiateQuery } from 'nextsrc/features/Instantiation/instantiation.queries';
import type { QueryClient } from '@tanstack/react-query';

export const partySelectionLoader = (queryClient: QueryClient) => (_: LoaderFunctionArgs) => {
  const userPartyId = GlobalData.userProfile?.partyId.toString();
  if (!userPartyId) {
    throw redirect('/');
  }

  queryClient.ensureQueryData(partiesAllowedToInstantiateQuery(userPartyId));

  return userPartyId;
};
