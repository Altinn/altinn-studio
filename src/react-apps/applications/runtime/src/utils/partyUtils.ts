import { IParty } from '../shared/resources/party/index';

function findPartyByPartyId(party: IParty, partyId: string) {
  if (party.partyId === partyId) {
    return party;
  } else if (party.childParties && party.childParties.length > 0) {
    for (const childParty of party.childParties) {
      return findPartyByPartyId(childParty, partyId);
    }
  } else {
    return null;
  }
}

export function findSelectedParty(parties: IParty[], partyId: string): IParty {
  let selectedParty: IParty = null;
  for (const party of parties) {
    selectedParty = findPartyByPartyId(party, partyId);
    if (selectedParty !== null) {
      break;
    }
  }
  return selectedParty;
}
