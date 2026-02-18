import React from 'react';
import { Form } from 'react-router-dom';

import classes from 'nextsrc/features/Instantiation/components/partySelection/partySelection.module.css';
import { routes } from 'nextsrc/routesBuilder';

import type { IParty } from 'src/types/shared';

type PartySelectionProps = {
  partiesAllowedToInstantiate: IParty[];
};

export function PartySelection({ partiesAllowedToInstantiate }: PartySelectionProps) {
  return (
    <div className={classes.container}>
      <h1>Party selection</h1>
      <Form
        method='put'
        action={routes.partySelection}
      >
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
}
