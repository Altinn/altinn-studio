import { type IParty, PartyType } from 'src/types/shared';
import type { IApplicationMetadata } from 'src/features/applicationMetadata';

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

export const reduceToValidParties = (parties: IParty[], appMetadata: IApplicationMetadata): IParty[] => {
  const allParties = flattenParties(parties);
  const { partyTypesAllowed } = appMetadata;

  const partyTypeFilters = {
    [PartyType.Organisation]: partyTypesAllowed.organisation,
    [PartyType.SubUnit]: partyTypesAllowed.subUnit,
    [PartyType.Person]: partyTypesAllowed.person,
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
