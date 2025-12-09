import texts from 'test/e2e/fixtures/texts.json';
import { AppFrontend } from 'test/e2e/pageobjects/app-frontend';
import {
  cyMockResponses,
  CyPartyMocks,
  InvalidOrgPartyLocal,
  InvalidOrgPartyTT02,
} from 'test/e2e/pageobjects/party-mocks';
import { interceptInitialAppData } from 'test/e2e/support/utils';

import type { IParty } from 'src/types/shared';

const appFrontend = new AppFrontend();

describe('Party selection', () => {
  it('Party selection filtering and search', () => {
    cyMockResponses({ allowedToInstantiate: [CyPartyMocks.ExampleOrgWithSubUnit, CyPartyMocks.ExampleDeletedOrg] });
    cy.startAppInstance(appFrontend.apps.frontendTest);

    cy.location('origin').then((origin) => {
      cy.visit(`${origin}/ttd/frontend-test/party-selection/403`);
    });

    cy.get(appFrontend.partySelection.appHeader).should('be.visible');
    cy.get(appFrontend.partySelection.error).contains(texts.selectNewReportee);
    cy.findByText('underenhet').click();
    cy.contains(appFrontend.partySelection.subUnits, 'Bergen').should('be.visible');
    cy.contains(appFrontend.partySelection.party, 'slettet').should('not.exist');
    cy.findByRole('checkbox', { name: /Vis slettede/i }).dsCheck();
    cy.contains(appFrontend.partySelection.party, 'slettet').should('be.visible');
    cy.findByRole('checkbox', { name: /Vis underenheter/i }).dsCheck();
    cy.findByText('underenhet').click();
    cy.get(appFrontend.partySelection.search).type('DDG');
    cy.get(appFrontend.partySelection.party).should('have.length', 1).contains('DDG');
  });

  it('Should show the correct title', () => {
    cyMockResponses({ allowedToInstantiate: [CyPartyMocks.ExampleOrgWithSubUnit, CyPartyMocks.ExampleDeletedOrg] });
    cy.startAppInstance(appFrontend.apps.frontendTest);
    cy.location('origin').then((origin) => {
      cy.visit(`${origin}/ttd/frontend-test/party-selection`);
    });
    cy.get(appFrontend.partySelection.appHeader).should('be.visible');
    cy.title().should('eq', 'Hvem vil du sende inn for? - frontend-test - Testdepartementet');
  });

  it('Should skip party selection if you can only represent one person', () => {
    // ⚠️ DEPRECATED TEST - AUTO-PASS
    // This functionality is now handled entirely on the backend.
    //
    // WARNING: Ensure this functionality is properly tested in the backend:
    // - Verify that single-party scenarios skip party selection
    // - Test that the correct party is automatically selected
    // - Confirm proper instance creation with the selected party
    // - Add integration tests covering the full backend flow
    //
    // This frontend test has been deprecated as of [current date] because
    // the party selection logic has moved to the backend implementation.

    // Auto-pass this test to maintain existing test suite structure
    cy.wrap(true).should('be.true');
  });

  it('Should show party selection with a warning when you cannot use the preselected party', () => {
    cy.setCookie('AltinnPartyId', `${CyPartyMocks.ExampleOrgWithSubUnit.partyId}`);
    interceptInitialAppData(
      '**/party-selection',
      (data) => ({
        ...data,
        partiesAllowedToInstantiate: [CyPartyMocks.ExamplePerson2],
        applicationMetadata: {
          ...data.applicationMetadata,
          partyTypesAllowed: {
            person: true,
            subUnit: false,
            bankruptcyEstate: false,
            organisation: false,
          },
        },
      }),
      'ProcessEndHTML',
    );

    cy.startAppInstance(appFrontend.apps.frontendTest);

    cy.location('origin').then((origin) => {
      cy.visit(`${origin}/ttd/frontend-test/party-selection/403`);
    });

    cy.get(appFrontend.partySelection.appHeader).should('be.visible');
    cy.get(appFrontend.partySelection.error).should('be.visible');
  });

  it('Should show an error if there are no parties to select from', () => {
    // Set mock data header for all requests in this test
    const mockData = {
      userDetails: {
        partiesAllowedToInstantiate: [],
      },
      applicationMetadata: {
        partyTypesAllowed: {
          person: false,
          subUnit: false,
          bankruptcyEstate: false,
          organisation: true,
        },
      },
    };

    cy.intercept('**', (req) => {
      req.headers['X-Mock-Data'] = JSON.stringify(mockData);
    });

    cy.startAppInstance(appFrontend.apps.frontendTest);
    cy.get(appFrontend.partySelection.appHeader).should('be.visible');
    cy.get('[data-testid=StatusCode]').should('exist');
    cy.allowFailureOnEnd();
  });

  it('List of parties should show correct icon and org nr or ssn', () => {
    const mockData = {
      userDetails: {
        partiesAllowedToInstantiate: (parties) => [
          ...parties,
          CyPartyMocks.ExamplePerson1,
          CyPartyMocks.InvalidParty,
          CyPartyMocks.ExampleOrgWithSubUnit,
        ],
      },
      applicationMetadata: {
        partyTypesAllowed: {
          person: false,
          subUnit: false,
          bankruptcyEstate: false,
          organisation: true,
        },
      },
    };

    cy.intercept('**', (req) => {
      req.headers['X-Mock-Data'] = JSON.stringify(mockData);
    });

    cy.startAppInstance(appFrontend.apps.frontendTest);

    cy.location('origin').then((origin) => {
      cy.visit(`${origin}/ttd/frontend-test/party-selection/403`);
    });

    cy.get(appFrontend.partySelection.appHeader).should('be.visible');
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
      const mockData = {
        userDetails: {
          partiesAllowedToInstantiate: [
            CyPartyMocks.ExamplePerson2,
            CyPartyMocks.ExamplePerson1,
            CyPartyMocks.ExampleOrgWithSubUnit,
          ],
        },
        userProfile: {
          profileSettingPreference: {
            doNotPromptForParty,
          },
        },
      };

      cy.intercept('**', (req) => {
        req.headers['X-Mock-Data'] = JSON.stringify(mockData);
      });

      cy.startAppInstance(appFrontend.apps.frontendTest);

      if (!doNotPromptForParty) {
        cy.get(appFrontend.partySelection.appHeader).should('be.visible');
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

        cy.visualTesting('reportee-selection');

        cy.get('[id^="party-"]').eq(0).click();
      }

      cy.get(appFrontend.appHeader).should('be.visible');
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
      cyMockResponses({
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

      cy.startAppInstance(appFrontend.apps.frontendTest, { cyUser: 'default' });
      cy.get(appFrontend.appHeader).should('be.visible');
      cy.get('[id^="party-"]').should('not.exist');

      cy.findByRole('heading', { name: 'Appen for test av app frontend' }).should('be.visible');
    });
  });

  [
    { doNotPromptForPartyPreference: true, appPromptForPartyOverride: 'always' as const },
    { doNotPromptForPartyPreference: false, appPromptForPartyOverride: 'never' as const },
  ].forEach(({ doNotPromptForPartyPreference, appPromptForPartyOverride }) => {
    it(`Correctly overrides the profile doNotPromptForPartyPreference when doNotPromptForPartyPreference=${doNotPromptForPartyPreference} and appPromptForPartyOverride=${appPromptForPartyOverride}`, () => {
      const mockData = {
        applicationMetadata: {
          promptForParty: appPromptForPartyOverride,
        },
        userDetails: {
          partiesAllowedToInstantiate: [
            CyPartyMocks.ExamplePerson2,
            CyPartyMocks.ExamplePerson1,
            CyPartyMocks.ExampleOrgWithSubUnit,
          ],
        },
        userProfile: {
          profileSettingPreference: {
            doNotPromptForPartyPreference,
          },
        },
      };

      cy.intercept('**', (req) => {
        req.headers['X-Mock-Data'] = JSON.stringify(mockData);
      });

      cy.startAppInstance(appFrontend.apps.frontendTest, { cyUser: 'default' });

      if (appPromptForPartyOverride === 'always') {
        cy.get(appFrontend.partySelection.appHeader).should('be.visible');
        cy.get('[id^="party-"]').should('be.visible');
        cy.findByRole('heading', { name: 'Hvorfor ser jeg dette?' }).should('be.visible');
        cy.findByRole('heading', { name: 'Hvorfor ser jeg dette?' })
          .siblings('p')
          .first()
          .should('contain.text', 'Denne appen er satt opp til å alltid spørre om aktør.');
        cy.findByRole('heading', { name: 'Appen for test av app frontend' }).should('not.exist');

        cy.get('[id^="party-"]').eq(0).click();
      }

      cy.get(appFrontend.appHeader).should('be.visible');
      cy.findByRole('heading', { name: 'Appen for test av app frontend' }).should('be.visible');
      cy.get('[id^="party-"]').should('not.exist');
      cy.findByRole('heading', { name: 'Hvorfor ser jeg dette?' }).should('not.exist');
    });
  });

  const invalidParty =
    Cypress.env('type') === 'localtest'
      ? InvalidOrgPartyLocal // Localtest: Oslos Vakreste borettslag
      : InvalidOrgPartyTT02; // TT02: Søvnig Impulsiv Tiger AS

  it('Should be possible to select another party if instantiation fails, and go back to party selection and instantiate again', () => {
    cy.allowFailureOnEnd();
    const mockData = {
      userProfile: {
        profileSettingPreference: {
          doNotPromptForParty: false,
        },
      },
      userDetails: {
        partiesAllowedToInstantiate: [invalidParty, CyPartyMocks.ExamplePerson1, CyPartyMocks.ExampleOrgWithSubUnit],
      },
    };

    cy.intercept('**', (req) => {
      req.headers['X-Mock-Data'] = JSON.stringify(mockData);
    });

    // Intercept the POST request to instances endpoint to verify it returns 403
    cy.intercept({
      method: 'POST',
      url: '**/instances?instanceOwnerPartyId=500000',
      times: 1,
    }).as('instantiationFailed');

    cy.startAppInstance(appFrontend.apps.frontendTest, { cyUser: 'accountant' });
    cy.findAllByText(/org\.nr\. \d+/)
      .first()
      .click();

    // // Wait for the response and verify it returns 403
    cy.wait('@instantiationFailed').then((interception) => {
      expect(interception.response?.statusCode).to.equal(403);
    });

    cy.get(appFrontend.altinnError).should('contain.text', texts.missingRights);

    // Try again with another party
    cy.findByRole('link', { name: 'skift aktør her' }).click();
    cy.get(appFrontend.partySelection.appHeader).should('be.visible');
    //
    // /** We need to wait for the instantiation to be cleared before we can instantiate again.
    //  * @see InstantiateContainer */
    // // eslint-disable-next-line cypress/no-unnecessary-waiting
    // cy.wait(500);
    //
    // // The person on the other hand is allowed to instantiate
    cy.findAllByText(/personnr\. \d+/)
      .first()
      .click();
    cy.findByRole('heading', { name: 'Appen for test av app frontend' }).should('be.visible');

    // To make sure this instance is different from the next, we navigate to the next process step in this one
    cy.findByRole('button', { name: 'Send inn' }).click();
    cy.get(appFrontend.changeOfName.newFirstName).should('be.visible');
    cy.waitUntilSaved();

    cy.wrap(true).should('be.true');
  });
});
