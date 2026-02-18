import React from 'react';
import { useLoaderData } from 'react-router-dom';

import { useQuery } from '@tanstack/react-query';
import { partiesAllowedToInstantiateQuery, PartySelection } from 'nextsrc/features/Instantiation';
import type { partySelectionLoader } from 'nextsrc/routes/party-selection/party-selection.loader';

export const PartySelectionPage = () => {
  const userPartyId = useLoaderData() as Awaited<ReturnType<ReturnType<typeof partySelectionLoader>>>;

  const { data: partiesAllowedToInstantiate, isPending } = useQuery(partiesAllowedToInstantiateQuery(userPartyId));

  if (isPending) {
    return 'Fetching parties...';
  }

  if (!partiesAllowedToInstantiate) {
    throw new Error('Backend returned null when we expected a list of parties.');
  }

  return <PartySelection partiesAllowedToInstantiate={partiesAllowedToInstantiate} />;
};
