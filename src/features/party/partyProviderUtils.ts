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

  // Fun fact: If all party types are false then all are true
  const allAllowed = Object.values(partyTypesAllowed).every((value) => !value);
  return allParties.filter((party) => isValid(party, partyTypesAllowed, allAllowed));
};

const subUnitTypes = ['BEDR', 'AAFY'];

/**
 * @see https://github.com/Altinn/app-lib-dotnet/blob/main/src/Altinn.App.Core/Helpers/InstantiationHelper.cs
 */
function isSubUnit(party: IParty): boolean {
  return (
    party.partyTypeName === PartyType.Organisation && !!(party.unitType && subUnitTypes.includes(party.unitType.trim()))
  );
}

/**
 * @see https://github.com/Altinn/app-lib-dotnet/blob/main/src/Altinn.App.Core/Helpers/InstantiationHelper.cs
 */
function isBankruptcyEstate(party: IParty): boolean {
  return party.partyTypeName === PartyType.Organisation && party.unitType?.trim() === 'KBO';
}

function isValid(party: IParty, partyTypesAllowed: IPartyTypesAllowed, allAllowed: boolean): boolean {
  if (party.isDeleted || party.onlyHierarchyElementWithNoAccess) {
    return false;
  }

  if (allAllowed) {
    return true;
  }

  if (isSubUnit(party)) {
    return partyTypesAllowed.subUnit;
  }

  if (isBankruptcyEstate(party)) {
    return partyTypesAllowed.bankruptcyEstate;
  }

  if (party.partyTypeName === PartyType.Organisation) {
    return partyTypesAllowed.organisation;
  }

  if (party.partyTypeName === PartyType.Person || party.partyTypeName === PartyType.SelfIdentified) {
    return partyTypesAllowed.person;
  }

  return false;
}
