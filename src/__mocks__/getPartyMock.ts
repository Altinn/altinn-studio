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

export type PartyWithSubunit = { org: IParty & { childParties: IParty[] }; person: IParty };
export const getPartyWithSubunitMock = (): PartyWithSubunit => ({
  org: {
    partyTypeName: PartyType.Organisation,
    name: 'Root Org',
    partyId: 1,
    orgNumber: '123456789',
    organization: {
      orgNumber: '123456789',
      name: 'Root Org',
      unitType: 'unitType',
      telephoneNumber: '12345678',
      mobileNumber: '87654321',
      faxNumber: '18724365',
      emailAddress: 'mail@example.com',
      internetAddress: 'example.com',
      mailingAddress: 'Økern portal',
      mailingPostalCode: '0580',
      mailingPostalCity: 'Oslo',
      businessPostalCode: '0580',
      businessPostalCity: 'Oslo',
    },
    ssn: null,
    isDeleted: false,
    onlyHierarchyElementWithNoAccess: false,
    childParties: [
      {
        partyTypeName: PartyType.SubUnit,
        name: 'Subunit Org',
        partyId: 2,
        orgNumber: '223456789',
        organization: {
          orgNumber: '223456789',
          name: 'Subunit Org',
          unitType: 'unitType',
          telephoneNumber: '12345678',
          mobileNumber: '87654321',
          faxNumber: '18724365',
          emailAddress: 'mail@example.com',
          internetAddress: 'example.com',
          mailingAddress: 'Økern portal',
          mailingPostalCode: '0580',
          mailingPostalCity: 'Oslo',
          businessPostalCode: '0580',
          businessPostalCity: 'Oslo',
        },
        ssn: null,
        isDeleted: false,
        onlyHierarchyElementWithNoAccess: false,
      },
    ],
  },
  person: {
    partyTypeName: PartyType.Person,
    name: 'Party2',
    partyId: 3,
    ssn: null,
    isDeleted: false,
    onlyHierarchyElementWithNoAccess: false,
  },
});
