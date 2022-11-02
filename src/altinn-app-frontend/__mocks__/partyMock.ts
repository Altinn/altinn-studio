import type { IParty } from '../../shared/src';

export const partyMock: IParty = {
  partyId: '12345',
  name: 'Ola Privatperson',
  ssn: '01017512345',
  partyTypeName: null,
  orgNumber: null,
  unitType: undefined,
  isDeleted: false,
  onlyHierarchyElementWithNoAccess: false,
  childParties: undefined,
};
