import { PartyType } from 'src/types/shared';
import type { IParty } from 'src/types/shared';

export const getPartyMock = (): IParty => ({
  partyId: 12345,
  name: 'Ola Privatperson',
  ssn: '01017512345',
  partyTypeName: PartyType.Person,
  orgNumber: null,
  unitType: undefined,
  isDeleted: false,
  onlyHierarchyElementWithNoAccess: false,
  childParties: undefined,
});
