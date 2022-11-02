import type { IParty } from 'altinn-shared/types';

export interface IPartyState {
  parties: IParty[] | null;
  selectedParty: IParty | null;
  error: Error | null;
}

export interface IGetPartiesFulfilled {
  parties: IParty[];
}

export interface IGetPartiesRejected {
  error: Error;
}

export interface ISelectParty {
  party: IParty;
  redirect: boolean;
}

export interface ISelectPartyFulfilled {
  party: IParty;
}

export interface ISelectPartyRejected {
  error: Error;
}
