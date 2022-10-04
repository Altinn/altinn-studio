import type { IPartyTypesAllowed } from 'src/shared/resources/applicationMetadata';
import type { IInstanceOwner } from 'altinn-shared/types';

export const partyTypesAllowed: IPartyTypesAllowed = {
  bankruptcyEstate: false,
  organisation: false,
  person: false,
  subUnit: false,
};
export const instanceOwner: IInstanceOwner = {
  partyId: '512345',
  personNumber: '01017512345',
  organisationNumber: null,
};
export const dataTypes = [
  {
    id: 'default',
    description: null,
    allowedContentTypes: ['application/xml'],
    allowedContributers: null,
    appLogic: {
      autoCreate: true,
      classRef: 'Altinn.App.Models.Skjema',
      schemaRef: null,
    },
    taskId: 'Task_1',
    maxSize: null,
    maxCount: 1,
    minCount: 1,
    grouping: null,
  },
  {
    id: 'ref-data-as-pdf',
    description: null,
    allowedContentTypes: ['application/pdf'],
    allowedContributers: null,
    appLogic: null,
    taskId: null,
    maxSize: null,
    maxCount: 0,
    minCount: 0,
    grouping: null,
  },
  {
    id: 'vedlegg',
    description: null,
    allowedContentTypes: null,
    allowedContributers: null,
    appLogic: null,
    taskId: 'Task_1',
    maxSize: 1,
    maxCount: 3,
    minCount: 0,
    grouping: null,
  },
];

const person = {
  ssn: '01017512345',
  name: 'Ola Nordmann',
  firstName: 'Ola',
  middleName: '',
  lastName: 'Nordmann',
  telephoneNumber: '12345678',
  mobileNumber: '87654321',
  mailingAddress: 'Blåbæreveien 7',
  mailingPostalCode: 8450,
  mailingPostalCity: 'Stokmarknes',
  addressMunicipalNumber: 1866,
  addressMunicipalName: 'Hadsel',
  addressStreetName: 'Blåbærveien',
  addressHouseNumber: 7,
  addressHouseLetter: null,
  addressPostalCode: 8450,
  addressCity: 'Stokarknes',
};
export const partyMember = {
  partyId: '512345',
  orgNumber: null,
  ssn: '01017512345',
  name: 'Ola Nordmann',
  person,
};
export const userProfile = {
  userId: 12345,
  userName: 'OlaNordmann',
  phoneNumber: '12345678',
  email: 'test@test.com',
  partyId: 512345,
  party: {
    partyId: '512345',
    partyTypeName: 1,
    orgNumber: null,
    ssn: '01017512345',
    unitType: null,
    name: 'Ola Nordmann',
    isDeleted: false,
    onlyHierarchyElementWithNoAccess: false,
    person,
  },
  userType: 0,
  profileSettingPreference: {
    language: 'nb',
    preSelectedPartyId: 0,
    doNotPromptForParty: false,
  },
};

export const defaultHandleDataChangeProps = [undefined, false, false];
