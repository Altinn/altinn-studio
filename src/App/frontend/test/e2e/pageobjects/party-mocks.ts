import { PartyType } from 'src/types/shared';
import type { IncomingApplicationMetadata, ShowTypes } from 'src/features/applicationMetadata/types';
import type { ISimpleInstance } from 'src/types';
import type { IParty } from 'src/types/shared';

const ExampleOrgWithSubUnit: IParty = {
  partyId: 500000,
  partyTypeName: PartyType.Organisation,
  orgNumber: '897069650',
  ssn: null,
  unitType: 'AS',
  name: 'DDG Fitness AS',
  isDeleted: false,
  onlyHierarchyElementWithNoAccess: false,
  person: null,
  organization: null,
  childParties: [
    {
      partyId: 500001,
      partyTypeName: PartyType.Organisation,
      orgNumber: '897069651',
      ssn: null,
      unitType: 'BEDR',
      name: 'DDG Fitness Bergen',
      isDeleted: false,
      onlyHierarchyElementWithNoAccess: false,
      person: null,
      organization: null,
      childParties: null,
    },
  ],
};

const ExampleDeletedOrg: IParty = {
  partyId: 500600,
  partyTypeName: PartyType.Organisation,
  orgNumber: '897069631',
  ssn: null,
  unitType: 'AS',
  name: 'EAS Health Consulting',
  isDeleted: true,
  onlyHierarchyElementWithNoAccess: false,
  person: null,
  organization: null,
  childParties: [],
};

const ExamplePerson1: IParty = {
  partyId: 12345678,
  partyTypeName: PartyType.Person,
  ssn: '12312312345',
  unitType: null,
  name: 'Fake Party',
  isDeleted: false,
  onlyHierarchyElementWithNoAccess: false,
  person: null,
  organization: null,
  childParties: null,
};

const ExamplePerson2: IParty = {
  partyId: 12345679,
  partyTypeName: PartyType.Person,
  ssn: '12312312344',
  unitType: null,
  name: 'Fake Person2',
  isDeleted: false,
  onlyHierarchyElementWithNoAccess: false,
  person: null,
  organization: null,
  childParties: null,
};

const InvalidParty: IParty = {
  partyId: 50085642,
  partyUuid: 'bb1aeb78-237e-47fb-b600-727803500985',
  partyTypeName: 1,
  orgNumber: '',
  ssn: '23033600534',
  unitType: null,
  name: 'RISHAUG JULIUS',
  isDeleted: false,
  onlyHierarchyElementWithNoAccess: false,
  person: null,
  organization: null,
  childParties: [],
};

export const CyPartyMocks = {
  ExampleOrgWithSubUnit,
  ExampleDeletedOrg,
  ExamplePerson1,
  ExamplePerson2,
  InvalidParty,
};

interface Mockable {
  preSelectedParty?: number;
  selectedParty?: IParty;
  allowedToInstantiate?: IParty[] | ((parties: IParty[]) => IParty[]);
  doNotPromptForParty?: boolean;
  appPromptForPartyOverride?: IncomingApplicationMetadata['promptForParty'];
  partyTypesAllowed?: IncomingApplicationMetadata['partyTypesAllowed'];
  activeInstances?: false | ISimpleInstance[]; // Defaults to false
  onEntryShow?: ShowTypes;
}

export function cyMockResponses(whatToMock: Mockable) {
  if (whatToMock.preSelectedParty !== undefined) {
    // Sets the 'AltinnPartyId' cookie to emulate having selected a party when logging in to Altinn
    cy.setCookie('AltinnPartyId', whatToMock.preSelectedParty.toString());
  }

  if (whatToMock.selectedParty) {
    cy.intercept('GET', `**/api/authorization/parties/current?returnPartyObject=true`, (req) => {
      req.on('response', (res) => {
        res.body = whatToMock.selectedParty;
      });
    });
  }

  if (whatToMock.allowedToInstantiate) {
    cy.intercept('GET', `**/api/v1/parties?allowedtoinstantiatefilter=true`, (req) => {
      req.continue((res) => {
        const body =
          whatToMock.allowedToInstantiate instanceof Function
            ? whatToMock.allowedToInstantiate(res.body)
            : // eslint-disable-next-line @typescript-eslint/no-explicit-any
              (whatToMock.allowedToInstantiate as any);
        res.send(body);
      });
    });
  }
  if (whatToMock.doNotPromptForParty !== undefined) {
    cy.intercept('GET', '**/api/v1/profile/user', {
      body: {
        profileSettingPreference: {
          doNotPromptForParty: whatToMock.doNotPromptForParty,
        },
      },
    });
  }
  if (
    whatToMock.appPromptForPartyOverride !== undefined ||
    whatToMock.partyTypesAllowed !== undefined ||
    whatToMock.onEntryShow !== undefined
  ) {
    cy.intercept('GET', '**/api/v1/applicationmetadata', (req) => {
      req.on('response', (res) => {
        const body = res.body as IncomingApplicationMetadata;
        if (whatToMock.appPromptForPartyOverride !== undefined) {
          body.promptForParty = whatToMock.appPromptForPartyOverride;
        }
        if (whatToMock.partyTypesAllowed !== undefined) {
          body.partyTypesAllowed = whatToMock.partyTypesAllowed;
        }
        if (whatToMock.onEntryShow !== undefined) {
          body.onEntry = { show: whatToMock.onEntryShow };
        }
      });
    });
  }

  cy.intercept('**/active', whatToMock.activeInstances || []).as('activeInstances');
}

export function removeAllButOneOrg(parties: IParty[]): IParty[] {
  // Some users in tt02 have so many valid parties that we get pagination. Remove all
  // except the first organisation, but keep all the persons.
  const toKeep: IParty[] = [];
  let foundOrganisation = false;
  for (const party of parties) {
    if (party.partyTypeName === PartyType.Organisation && !foundOrganisation) {
      toKeep.push(party);
      foundOrganisation = true;
    }
    if (party.partyTypeName === PartyType.Person) {
      toKeep.push(party);
    }
  }
  return toKeep;
}
