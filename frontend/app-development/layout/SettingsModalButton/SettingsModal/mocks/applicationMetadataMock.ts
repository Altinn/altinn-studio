import { ApplicationMetadata, PartyTypesAllowed } from 'app-shared/types/ApplicationMetadata';

const mockPartyTypesAllowed: PartyTypesAllowed = {
  bankruptcyEstate: true,
  organisation: false,
  person: false,
  subUnit: false,
};

export const mockAppMetadata: ApplicationMetadata = {
  id: 'mockId',
  org: 'org',
  partyTypesAllowed: mockPartyTypesAllowed,
};
