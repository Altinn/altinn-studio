import React from 'react';
import { Form } from 'react-router-dom';

import { useQuery } from '@tanstack/react-query';
import { partiesAllowedToInstantiateQuery } from 'nextsrc/core/queries/parties/parties.queries';
import classes from 'nextsrc/routes/party-selection/party-selection.route.module.css';

export const PartySelectionPage = () => {
  const { data: partiesAllowedToInstantiate, isPending } = useQuery(partiesAllowedToInstantiateQuery());

  if (isPending) {
    return 'Fetching parties...';
  }

  return (
    <div className={classes.container}>
      <h1>Party selection</h1>
      <Form method='put'>
        {partiesAllowedToInstantiate?.map((party) => (
          <button
            name='partyId'
            key={party.partyId}
            value={party.partyId}
          >
            {party.name}
          </button>
        ))}
      </Form>
    </div>
  );
};
