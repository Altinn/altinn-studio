import { IParty } from '../types';

export function renderPartyName(party: IParty) {
  if (!party) {
    return null;
  }
  if (party.person) {
    const user = party.person.firstName.concat(
      ' ',
      (party.person.middleName !== null ?
        (party.person.middleName.concat(' ')) : ''),
      party.person.lastName);
    return user.toUpperCase();
  } else if (party.organisation) {
    return party.organisation.name.toUpperCase();
  }
  return null;
}
