import texts from 'test/e2e/fixtures/texts.json';
import { AppFrontend } from 'test/e2e/pageobjects/app-frontend';
import { cyMockResponses, CyPartyMocks, removeAllButOneOrg } from 'test/e2e/pageobjects/party-mocks';

import type { IParty } from 'src/types/shared';

const appFrontend = new AppFrontend();

describe('Party selection', () => {
  it('Party selection filtering and search', () => {
    cyMockResponses({ allowedToInstantiate: [CyPartyMocks.ExampleOrgWithSubUnit, CyPartyMocks.ExampleDeletedOrg] });
    cy.startAppInstance(appFrontend.apps.frontendTest);
    cy.get(appFrontend.reporteeSelection.appHeader).should('be.visible');
    cy.get(appFrontend.reporteeSelection.error).contains(texts.selectNewReportee);
    cy.findByText('underenhet').click();
    cy.contains(appFrontend.reporteeSelection.subUnits, 'Bergen').should('be.visible');
    cy.contains(appFrontend.reporteeSelection.reportee, 'slettet').should('not.exist');
    cy.findByRole('checkbox', { name: /Vis slettede/i }).dsCheck();
    cy.contains(appFrontend.reporteeSelection.reportee, 'slettet').should('be.visible');
    cy.findByRole('checkbox', { name: /Vis underenheter/i }).dsCheck();
    cy.findByText('underenhet').click();
    cy.get(appFrontend.reporteeSelection.searchReportee).type('DDG');
    cy.get(appFrontend.reporteeSelection.reportee).should('have.length', 1).contains('DDG');
  });

  it('Should show the correct title', () => {
    cyMockResponses({ allowedToInstantiate: [CyPartyMocks.ExampleOrgWithSubUnit, CyPartyMocks.ExampleDeletedOrg] });
    cy.startAppInstance(appFrontend.apps.frontendTest);
    cy.get(appFrontend.reporteeSelection.appHeader).should('be.visible');
    cy.title().should('eq', 'Hvem vil du sende inn for? - frontend-test - Testdepartementet');
  });

  it('Should skip party selection if you can only represent one person', () => {
    cyMockResponses({
      preSelectedParty: CyPartyMocks.ExamplePerson1.partyId,
      selectedParty: CyPartyMocks.ExamplePerson1,
      allowedToInstantiate: [CyPartyMocks.ExamplePerson1],
    });
    cy.intercept(
      'POST',
      `/ttd/frontend-test/instances?instanceOwnerPartyId=${CyPartyMocks.ExamplePerson1.partyId}*`,
    ).as('loadInstance');
    cy.startAppInstance(appFrontend.apps.frontendTest);
    cy.get(appFrontend.reporteeSelection.reportee).should('not.exist');
    cy.wait('@loadInstance');

    // This fails in the end because the partyId does not exist, but we still proved
    // that party selection did not appear (even though @loadInstance fails with a 404)
    cy.allowFailureOnEnd();
  });

  it('Should show party selection with a warning when you cannot use the preselected party', () => {
    cyMockResponses({
      preSelectedParty: CyPartyMocks.ExampleOrgWithSubUnit.partyId,

      // We'll only allow one party to be selected, and it's not the preselected one. Even though one-party-choices
      // normally won't show up as being selectable, we'll still show the warning in these cases.
      allowedToInstantiate: [CyPartyMocks.ExamplePerson2],
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
    cyMockResponses({
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
    cy.get('[data-testid=StatusCode]').should('exist');
    cy.allowFailureOnEnd();
  });

  it('List of parties should show correct icon and org nr or ssn', () => {
    cyMockResponses({
      allowedToInstantiate: (parties) => [
        ...parties,
        CyPartyMocks.ExamplePerson1,
        CyPartyMocks.InvalidParty,
        CyPartyMocks.ExampleOrgWithSubUnit,
      ],
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
      cyMockResponses({
        allowedToInstantiate: (parties) => [...parties, CyPartyMocks.ExamplePerson1],
        doNotPromptForParty,
      });
      cy.startAppInstance(appFrontend.apps.frontendTest);

      if (!doNotPromptForParty) {
        cy.get(appFrontend.reporteeSelection.appHeader).should('be.visible');
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
      cyMockResponses({
        doNotPromptForParty: doNotPromptForPartyPreference,
        appPromptForPartyOverride,
        allowedToInstantiate: (parties) => [...parties, CyPartyMocks.ExamplePerson1],
      });
      cy.startAppInstance(appFrontend.apps.frontendTest, { cyUser: 'default' });

      if (appPromptForPartyOverride === 'always') {
        cy.get(appFrontend.reporteeSelection.appHeader).should('be.visible');
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

  it('Should be possible to select another party if instantiation fails, and go back to party selection and instantiate again', () => {
    cy.allowFailureOnEnd();
    cyMockResponses({
      allowedToInstantiate: removeAllButOneOrg,
      doNotPromptForParty: false,
    });
    cy.startAppInstance(appFrontend.apps.frontendTest, { cyUser: 'accountant' });

    // Select the first organisation. This is not allowed to instantiate in this app, so it will throw an error.
    cy.findAllByText(/org\.nr\. \d+/)
      .first()
      .click();
    cy.get(appFrontend.altinnError).should('contain.text', texts.missingRights);

    // Try again with another party
    cy.findByRole('link', { name: 'skift aktør her' }).click();
    cy.get(appFrontend.reporteeSelection.appHeader).should('be.visible');

    /** We need to wait for the instantiation to be cleared before we can instantiate again.
     * @see InstantiateContainer */
    // eslint-disable-next-line cypress/no-unnecessary-waiting
    cy.wait(500);

    // The person on the other hand is allowed to instantiate
    cy.findAllByText(/personnr\. \d+/)
      .first()
      .click();
    cy.findByRole('heading', { name: 'Appen for test av app frontend' }).should('be.visible');

    // To make sure this instance is different from the next, we navigate to the next process step in this one
    cy.findByRole('button', { name: 'Send inn' }).click();
    cy.get(appFrontend.changeOfName.newFirstName).should('be.visible');
    cy.waitUntilSaved();

    // Navigate directly to /#/party-selection to test that instantiation once more works
    cy.window().then((win) => {
      win.location.hash = '#/party-selection';
    });
    cy.get(appFrontend.reporteeSelection.appHeader).should('be.visible');

    // eslint-disable-next-line cypress/no-unnecessary-waiting
    cy.wait(500);

    cy.findAllByText(/personnr\. \d+/)
      .first()
      .click();
    cy.findByRole('heading', { name: 'Appen for test av app frontend' }).should('be.visible');
  });
});
