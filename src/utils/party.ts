import type { IParty } from 'src/types/shared';

export function renderPartyName(party: IParty) {
  if (!party) {
    return null;
  }
  return party.name;
}
