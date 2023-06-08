import type { IParty } from 'src/types/shared';

export interface IPartyState {
  parties: IParty[] | null;
  selectedParty: IParty | null;
  error: Error | null;
  autoRedirect?: boolean;
}

export interface IGetPartiesFulfilled {
  parties: IParty[];
}

export interface IGetPartiesRejected {
  error: Error;
}

export interface ISelectParty {
  party: IParty;
}

export interface ISelectPartyFulfilled {
  party: IParty | null;
}

export interface ISelectPartyRejected {
  error: Error;
}
