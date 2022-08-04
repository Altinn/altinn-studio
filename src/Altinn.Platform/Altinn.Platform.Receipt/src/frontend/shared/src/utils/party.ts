import { IParty } from '../types';

export function renderPartyName(party: IParty) {
  if (!party) {
    return null;
  }
  return party.name;
}
