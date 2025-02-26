import type { IInstance, IInstanceOwner, IParty, IProfile } from 'src/types/shared';

export function getPartyDisplayName(party?: IParty, user?: IProfile) {
  if (party && user?.party && party.partyId === user.party.partyId) {
    return user.party.name;
  }
  if (party && user?.party && party.partyId !== user.party.partyId) {
    return `${user.party.name} for ${party.name}`;
  }
  return null;
}

export function getInstanceOwnerParty(instance?: IInstance | IInstanceOwner, parties?: IParty[]): IParty | undefined {
  if (!instance || !parties) {
    return undefined;
  }

  // This logic assumes that the current logged in user has "access" to the party of the instance owner,
  // as the parties array comes from the current users party list.
  const allParties = [...parties, ...parties.flatMap((party) => party.childParties ?? [])];
  const instanceOwner = 'instanceOwner' in instance ? instance.instanceOwner : instance;
  return allParties.find((party) => party.partyId.toString() === instanceOwner.partyId);
}
