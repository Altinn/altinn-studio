import { IProfile } from 'altinn-shared/types';

export function renderParty(profile: IProfile) {
  const party = profile ? profile.party : null;
  if (party && party.person) {
    const user = party.person.firstName.concat(
      ' ',
      (party.person.middleName !== null ?
        (party.person.middleName.concat(' ')) : ''),
      party.person.lastName,
    );
    return user.toUpperCase();
  }
  return null;
}
