import type { IParty } from '../types/global';

export function renderPartyName(party: IParty) {
  if (!party) {
    return null;
  }
  return party.name;
}
