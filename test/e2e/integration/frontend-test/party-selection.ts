import texts from 'test/e2e/fixtures/texts.json';
import { AppFrontend } from 'test/e2e/pageobjects/app-frontend';

import { PartyType } from 'src/types/shared';
import type { IncomingApplicationMetadata } from 'src/features/applicationMetadata/types';
import type { IParty } from 'src/types/shared';

const appFrontend = new AppFrontend();

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

interface Mockable {
  preSelectedParty?: number;
  currentParty?: IParty;
  allowedToInstantiate?: IParty[] | ((parties: IParty[]) => IParty[]);
  doNotPromptForParty?: boolean;
  appPromptForPartyOverride?: IncomingApplicationMetadata['promptForParty'];
  partyTypesAllowed?: IncomingApplicationMetadata['partyTypesAllowed'];
}

function mockResponses(whatToMock: Mockable) {
  if (whatToMock.preSelectedParty !== undefined) {
    // Sets the 'AltinnPartyId' cookie to emulate having selected a party when logging in to Altinn
    cy.setCookie('AltinnPartyId', whatToMock.preSelectedParty.toString());
  }

  if (whatToMock.currentParty) {
    cy.intercept('GET', `**/api/authorization/parties/current?returnPartyObject=true`, (req) => {
      req.on('response', (res) => {
        res.body = whatToMock.currentParty;
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
  if (whatToMock.appPromptForPartyOverride !== undefined || whatToMock.partyTypesAllowed !== undefined) {
    cy.intercept('GET', '**/api/v1/applicationmetadata', (req) => {
      req.on('response', (res) => {
        if (whatToMock.appPromptForPartyOverride !== undefined) {
          res.body.promptForParty = whatToMock.appPromptForPartyOverride;
        }
        if (whatToMock.partyTypesAllowed !== undefined) {
          res.body.partyTypesAllowed = whatToMock.partyTypesAllowed;
        }
      });
    });
  }

  cy.intercept('**/active', []).as('noActiveInstances');
}

describe('Party selection', () => {
  it('Party selection filtering and search', () => {
    mockResponses({ allowedToInstantiate: [ExampleOrgWithSubUnit, ExampleDeletedOrg] });
    cy.startAppInstance(appFrontend.apps.frontendTest);
    cy.get(appFrontend.reporteeSelection.appHeader).should('be.visible');
    cy.get(appFrontend.reporteeSelection.error).contains(texts.selectNewReportee);
    cy.findByText('underenheter').click();
    cy.contains(appFrontend.reporteeSelection.subUnits, 'Bergen').should('be.visible');
    cy.contains(appFrontend.reporteeSelection.reportee, 'slettet').should('not.exist');
    cy.findByRole('checkbox', { name: /Vis slettede/i }).dsCheck();
    cy.contains(appFrontend.reporteeSelection.reportee, 'slettet').should('be.visible');
    cy.findByRole('checkbox', { name: /Vis underenheter/i }).dsCheck();
    cy.findByText('underenheter').click();
    cy.get(appFrontend.reporteeSelection.searchReportee).type('DDG');
    cy.get(appFrontend.reporteeSelection.reportee).should('have.length', 1).contains('DDG');
  });

  it('Should skip party selection if you can only represent one person', () => {
    mockResponses({
      preSelectedParty: ExamplePerson1.partyId,
      currentParty: ExamplePerson1,
      allowedToInstantiate: [ExamplePerson1],
    });
    cy.intercept('POST', `/ttd/frontend-test/instances?instanceOwnerPartyId=12345678`).as('loadInstance');
    cy.startAppInstance(appFrontend.apps.frontendTest);
    cy.get(appFrontend.reporteeSelection.reportee).should('not.exist');
    cy.wait('@loadInstance');

    // This fails in the end because the partyId does not exist, but we still proved
    // that party selection did not appear (even though @loadInstance fails with a 404)
    cy.allowFailureOnEnd();
  });

  it('Should show party selection with a warning when you cannot use the preselected party', () => {
    mockResponses({
      preSelectedParty: ExampleOrgWithSubUnit.partyId,

      // We'll only allow one party to be selected, and it's not the preselected one. Even though one-party-choices
      // normally won't show up as being selectable, we'll still show the warning in these cases.
      allowedToInstantiate: [ExamplePerson2],
      partyTypesAllowed: {
        person: true,
        subUnit: false,
        bankruptcyEstate: false,
        organisation: false,
      },
    });

    cy.startAppInstance(appFrontend.apps.frontendTest);
    cy.get(appFrontend.reporteeSelection.appHeader).should('be.visible');
    cy.get(appFrontend.reporteeSelection.error).should('be.visible');
  });

  it('Should show an error if there are no parties to select from', () => {
    mockResponses({
      allowedToInstantiate: [],
      partyTypesAllowed: {
        person: false,
        subUnit: false,
        bankruptcyEstate: false,
        organisation: true,
      },
    });
    cy.startAppInstance(appFrontend.apps.frontendTest);
    cy.get(appFrontend.reporteeSelection.appHeader).should('be.visible');
    cy.get('[data-testid=StatusCode').should('exist');
    cy.allowFailureOnEnd();
  });

  it('List of parties should show correct icon and org nr or ssn', () => {
    mockResponses({
      allowedToInstantiate: (parties) => [...parties, ExamplePerson1, InvalidParty, ExampleOrgWithSubUnit],
      doNotPromptForParty: false,
    });
    cy.startAppInstance(appFrontend.apps.frontendTest);
    cy.get(appFrontend.reporteeSelection.appHeader).should('be.visible');
    cy.get('[id^="party-"]').each((element) => {
      // Check for SVG elements with specific test IDs
      const orgIcon = element.find('svg[data-testid="org-icon"]');
      const personIcon = element.find('svg[data-testid="person-icon"]');

      if (orgIcon.length > 0) {
        // Validate sibling for org-icon
        const siblingP = orgIcon.next().next();
        cy.wrap(siblingP).should('exist').and('have.prop', 'tagName', 'P').and('contain.text', 'org.nr.');
      }

      if (personIcon.length > 0) {
        // Validate sibling for person-icon
        const siblingP = personIcon.next().next();
        cy.wrap(siblingP).should('exist').and('have.prop', 'tagName', 'P').and('contain.text', 'personnr');
      }
    });
  });

  [false].forEach((doNotPromptForParty) => {
    it(`${
      doNotPromptForParty ? 'Does not prompt' : 'Prompts'
    } for party when doNotPromptForParty = ${doNotPromptForParty}, on instantiation with multiple possible parties`, () => {
      mockResponses({
        allowedToInstantiate: (parties) => [...parties, ExamplePerson1],
        doNotPromptForParty,
      });
      cy.startAppInstance(appFrontend.apps.frontendTest);
      cy.get(appFrontend.reporteeSelection.appHeader).should('be.visible');

      if (!doNotPromptForParty) {
        cy.get('[id^="party-"]').should('be.visible');
        cy.findByRole('heading', { name: 'Hvorfor ser jeg dette?' }).should('be.visible');
        cy.findByRole('heading', { name: 'Hvorfor ser jeg dette?' })
          .siblings('p')
          .first()
          .should(
            'contain.text',
            'Du kan endre profilinnstillingene dine for å ikke bli spurt om aktør hver gang du starter utfylling av et nytt skjema.',
          );
        cy.findByRole('heading', { name: 'Appen for test av app frontend' }).should('not.exist');

        cy.snapshot('reportee-selection');

        cy.get('[id^="party-"]').eq(0).click();
      }

      cy.findByRole('heading', { name: 'Appen for test av app frontend' }).should('be.visible');
      cy.get('[id^="party-"]').should('not.exist');

      // Test that it goes straight in when accessing an existing instance
      cy.reloadAndWait();

      cy.findByRole('heading', { name: 'Appen for test av app frontend' }).should('be.visible');
      cy.get('[id^="party-"]').should('not.exist');
    });
  });

  [true, false].forEach((doNotPromptForParty) => {
    it(`Does not prompt for party when doNotPromptForParty = ${doNotPromptForParty}, on instantiation with only one possible party`, () => {
      mockResponses({
        doNotPromptForParty,
      });

      // The /parties request and /current request happen in parallel, so we need
      // to await the first request in order to use its value in the second intercept.
      let resolveParties: () => void;
      const partiesPromise = new Promise<void>((res) => {
        resolveParties = res;
      });
      // Need to make sure the returned party is the same current party:
      let correctParty: IParty | undefined = undefined;
      cy.intercept(
        {
          method: 'GET',
          url: `**/api/v1/parties?allowedtoinstantiatefilter=true`,
          times: 1,
        },
        (req) => {
          req.on('response', (res) => {
            const parties = res.body as IParty[];
            correctParty = parties[0]; // parties.find((party: IParty) => party.partyId == partyId);
            if (!correctParty) {
              throw new Error(`No parties returned from api`);
            }
            res.send([correctParty]);
            resolveParties();
          });
        },
      );
      cy.intercept(
        {
          method: 'GET',
          url: `**/api/authorization/parties/current?returnPartyObject=true`,
          times: 1,
        },
        (req) => {
          req.on('response', async (res) => {
            await partiesPromise;
            if (!correctParty) {
              throw new Error(`No parties returned from api`);
            }
            res.send(correctParty);
          });
        },
      );

      cy.startAppInstance(appFrontend.apps.frontendTest, { user: 'default' });
      cy.get(appFrontend.reporteeSelection.appHeader).should('be.visible');
      cy.get('[id^="party-"]').should('not.exist');

      cy.findByRole('heading', { name: 'Appen for test av app frontend' }).should('be.visible');
    });
  });

  [
    { doNotPromptForPartyPreference: true, appPromptForPartyOverride: 'always' as const },
    { doNotPromptForPartyPreference: false, appPromptForPartyOverride: 'never' as const },
  ].forEach(({ doNotPromptForPartyPreference, appPromptForPartyOverride }) => {
    it(`Correctly overrides the profile doNotPromptForPartyPreference when doNotPromptForPartyPreference=${doNotPromptForPartyPreference} and appPromptForPartyOverride=${appPromptForPartyOverride}`, () => {
      mockResponses({
        doNotPromptForParty: doNotPromptForPartyPreference,
        appPromptForPartyOverride,
        allowedToInstantiate: (parties) => [...parties, ExamplePerson1],
      });
      cy.startAppInstance(appFrontend.apps.frontendTest, { user: 'default' });
      cy.get(appFrontend.reporteeSelection.appHeader).should('be.visible');

      if (appPromptForPartyOverride === 'always') {
        cy.get('[id^="party-"]').should('be.visible');
        cy.findByRole('heading', { name: 'Hvorfor ser jeg dette?' }).should('be.visible');
        cy.findByRole('heading', { name: 'Hvorfor ser jeg dette?' })
          .siblings('p')
          .first()
          .should('contain.text', 'Denne appen er satt opp til å alltid spørre om aktør.');
        cy.findByRole('heading', { name: 'Appen for test av app frontend' }).should('not.exist');

        cy.get('[id^="party-"]').eq(0).click();
      }

      cy.findByRole('heading', { name: 'Appen for test av app frontend' }).should('be.visible');
      cy.get('[id^="party-"]').should('not.exist');
      cy.findByRole('heading', { name: 'Hvorfor ser jeg dette?' }).should('not.exist');
    });
  });
});
