import type { IInstance, IInstanceOwner, IParty, IProfile } from 'src/types/shared';

export function renderPartyName(party: IParty) {
  if (!party) {
    return null;
  }
  return party.name;
}

export function renderParty(profile: IProfile) {
  const party = profile?.party;
  if (party?.person) {
    const user = party.person.firstName.concat(
      ' ',
      party.person.middleName !== null ? party.person.middleName.concat(' ') : '',
      party.person.lastName,
    );
    return user.toUpperCase();
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
