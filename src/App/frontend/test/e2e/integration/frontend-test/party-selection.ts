import texts from 'test/e2e/fixtures/texts.json';
import { AppFrontend } from 'test/e2e/pageobjects/app-frontend';
import { cyMockResponses, CyPartyMocks } from 'test/e2e/pageobjects/party-mocks';
import { interceptAltinnAppGlobalData } from 'test/e2e/support/intercept-global-data';

const appFrontend = new AppFrontend();

describe('Party selection', () => {
  it('Party selection filtering and search', () => {
    // Mock the parties that will be shown in the party selection UI
    cyMockResponses({ allowedToInstantiate: [CyPartyMocks.ExampleOrgWithSubUnit, CyPartyMocks.ExampleDeletedOrg] });
    // Log in as multiPartyPrompt user
    cy.startAppInstance(appFrontend.apps.frontendTest, { cyUser: 'multiPartyPrompt' });
    cy.visit(`/ttd/${appFrontend.apps.frontendTest}/`);
    cy.get(appFrontend.partySelection.appHeader).should('be.visible');
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
    // Use multiPartyPrompt user (doNotPromptForParty=false) to trigger backend redirect to party selection
    cyMockResponses({ allowedToInstantiate: [CyPartyMocks.ExampleOrgWithSubUnit, CyPartyMocks.ExampleDeletedOrg] });
    cy.startAppInstance(appFrontend.apps.frontendTest, { cyUser: 'multiPartyPrompt' });
    cy.get(appFrontend.partySelection.appHeader).should('be.visible');
    cy.title().should('eq', `Hvem vil du sende inn for? - ${appFrontend.apps.frontendTest} - Testdepartementet`);
  });

  it('Should skip party selection if you can only represent one person', () => {
    cyMockResponses({
      preSelectedParty: CyPartyMocks.ExamplePerson1.partyId,
      allowedToInstantiate: [CyPartyMocks.ExamplePerson1],
    });

    interceptAltinnAppGlobalData((globalData) => {
      globalData.selectedParty = CyPartyMocks.ExamplePerson1;
    });

    cy.intercept(
      'POST',
      `/ttd/${appFrontend.apps.frontendTest}/instances?instanceOwnerPartyId=${CyPartyMocks.ExamplePerson1.partyId}*`,
    ).as('loadInstance');
    cy.startAppInstance(appFrontend.apps.frontendTest);
    cy.get(appFrontend.partySelection.party).should('not.exist');
    cy.wait('@loadInstance');

    // This fails in the end because the partyId does not exist, but we still proved
    // that party selection did not appear (even though @loadInstance fails with a 404)
    cy.allowFailureOnEnd();
  });

  it('Should show party selection with a warning when you cannot use the preselected party', () => {
    // Mock the parties shown in the UI
    cyMockResponses({
      preSelectedParty: CyPartyMocks.ExampleOrgWithSubUnit.partyId,
      // We'll only allow one party to be selected, and it's not the preselected one
      allowedToInstantiate: [CyPartyMocks.ExamplePerson2],
      partyTypesAllowed: {
        person: true,
        subUnit: false,
        bankruptcyEstate: false,
        organisation: false,
      },
    });

    // Log in as multiPartyPrompt user
    cy.startAppInstance(appFrontend.apps.frontendTest, { cyUser: 'multiPartyPrompt' });
    // Set cookie to a party that exists but user 2001 cannot represent (triggers CanRepresent=false)
    cy.setCookie('AltinnPartyId', '510001');
    // Navigate to app root - backend will redirect to /party-selection/403
    cy.visit(`/ttd/${appFrontend.apps.frontendTest}/`);
    cy.get(appFrontend.partySelection.appHeader).should('be.visible');
    cy.get(appFrontend.partySelection.error).should('be.visible');
  });

  it('Should show an error if there are no parties to select from', () => {
    // Use multiPartyPrompt user (doNotPromptForParty=false) to trigger backend redirect to party selection
    cyMockResponses({
      allowedToInstantiate: [],
      partyTypesAllowed: {
        person: false,
        subUnit: false,
        bankruptcyEstate: false,
        organisation: true,
      },
    });
    cy.startAppInstance(appFrontend.apps.frontendTest, { cyUser: 'multiPartyPrompt' });
    cy.get(appFrontend.partySelection.appHeader).should('be.visible');
    cy.get('[data-testid=StatusCode]').should('exist');
    cy.allowFailureOnEnd();
  });

  it('List of parties should show correct icon and org nr or ssn', () => {
    // Use multiPartyPrompt user (doNotPromptForParty=false) to trigger backend redirect to party selection
    cyMockResponses({
      allowedToInstantiate: (parties) => [
        ...parties,
        CyPartyMocks.ExamplePerson1,
        CyPartyMocks.InvalidParty,
        CyPartyMocks.ExampleOrgWithSubUnit,
      ],
    });
    cy.startAppInstance(appFrontend.apps.frontendTest, { cyUser: 'multiPartyPrompt' });
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

  it(`Prompts for party when doNotPromptForParty = false, on instantiation with multiple possible parties`, () => {
    cy.intercept('**/active', []).as('noActiveInstances');

    cy.startAppInstance(appFrontend.apps.frontendTest, { cyUser: 'multiPartyPrompt2' });

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
    cy.get(appFrontend.appHeader).should('be.visible');
    cy.findByRole('heading', { name: 'Appen for test av app frontend' }).should('be.visible');
    cy.get('[id^="party-"]').should('not.exist');

    // Test that it goes straight in when accessing an existing instance
    cy.reloadAndWait();

    cy.findByRole('heading', { name: 'Appen for test av app frontend' }).should('be.visible');
    cy.get('[id^="party-"]').should('not.exist');
  });

  it('Does not prompt for party when user has only one party', () => {
    cy.intercept('**/active', []).as('activeInstances');
    // User 12345 (default) has only one party - backend skips redirect regardless of doNotPromptForParty
    cy.startAppInstance(appFrontend.apps.frontendTest, { cyUser: 'default' });

    // Should skip party selection and go straight to app
    cy.get(appFrontend.appHeader).should('be.visible');
    cy.get('[id^="party-"]').should('not.exist');
    cy.findByRole('heading', { name: 'Appen for test av app frontend' }).should('be.visible');
  });

  it('Does not prompt for party when user has doNotPromptForParty=true even with multiple parties', () => {
    cy.intercept('**/active', []).as('activeInstances');
    // User 1001 (doNotPromptParty) has doNotPromptForParty=true and 2 parties in localtest,
    // logged in with personal party 510001 which has instantiation rights
    cy.startAppInstance(appFrontend.apps.frontendTest, { cyUser: 'doNotPromptParty' });

    // Should skip party selection and go straight to app
    cy.get(appFrontend.appHeader).should('be.visible');
    cy.get('[id^="party-"]').should('not.exist');
    cy.findByRole('heading', { name: 'Appen for test av app frontend' }).should('be.visible');
  });

  it('Should be possible to select another party if instantiation fails, and go back to party selection and instantiate again', () => {
    cy.intercept('**/active', []).as('activeInstances');
    cy.allowFailureOnEnd();
    // Use multiPartyPrompt2 user (doNotPromptForParty=false) to trigger backend redirect to party selection
    cy.startAppInstance(appFrontend.apps.frontendTest, { cyUser: 'multiPartyPrompt2' });

    cy.intercept('**/active', []).as('activeInstances');

    // Select the first organisation. This is not allowed to instantiate in this app, so it will throw an error.
    cy.findAllByText(/org\.nr\. \d+/)
      .first()
      .click();
    cy.get(appFrontend.altinnError).should('contain.text', texts.missingRights);

    // Try again with another party
    cy.findByRole('link', { name: 'skift aktør her' }).click();
    cy.get(appFrontend.partySelection.appHeader).should('be.visible');

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
      win.location.pathname = `/ttd/${appFrontend.apps.frontendTest}/party-selection`;
    });
    cy.get(appFrontend.partySelection.appHeader).should('be.visible');

    // eslint-disable-next-line cypress/no-unnecessary-waiting
    cy.wait(500);

    cy.findAllByText(/personnr\. \d+/)
      .first()
      .click();
    cy.findByRole('heading', { name: 'Appen for test av app frontend' }).should('be.visible');
  });
});
