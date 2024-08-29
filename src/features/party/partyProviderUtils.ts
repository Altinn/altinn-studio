import { type IParty, PartyType } from 'src/types/shared';
import type { IPartyTypesAllowed } from 'src/features/applicationMetadata/types';

export const flattenParties = (parties: IParty[]): IParty[] => {
  const result: IParty[] = [];
  const stack = [...parties];

  while (stack.length) {
    const current = stack.pop();
    if (current) {
      result.push(current);
      if (current.childParties) {
        stack.push(...current.childParties);
      }
    }
  }

  return result;
};

export const reduceToValidParties = (parties: IParty[], partyTypesAllowed: IPartyTypesAllowed): IParty[] => {
  const allParties = flattenParties(parties);

  const partyTypeFilters: { [key in PartyType]: boolean } = {
    [PartyType.Organisation]: partyTypesAllowed.organisation,
    [PartyType.SubUnit]: partyTypesAllowed.subUnit,
    [PartyType.Person]: partyTypesAllowed.person,
    [PartyType.SelfIdentified]: partyTypesAllowed.person, // Self-identified is treated as a person
    [PartyType.BankruptcyEstate]: partyTypesAllowed.bankruptcyEstate,
  };

  // Fun fact: If all party types are false then all are true
  if (Object.values(partyTypeFilters).every((value) => !value)) {
    return allParties.filter((party) => !party.isDeleted && !party.onlyHierarchyElementWithNoAccess);
  }

  return allParties.filter(
    (party) => !party.isDeleted && !party.onlyHierarchyElementWithNoAccess && partyTypeFilters[party.partyTypeName],
  );
};
