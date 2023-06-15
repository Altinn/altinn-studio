import texts from 'test/e2e/fixtures/texts.json';
import { AppFrontend } from 'test/e2e/pageobjects/app-frontend';

const appFrontend = new AppFrontend();

describe('Reportee selection', () => {
  beforeEach(() => {
    cy.fixture('allowed-parties.json').then((allowedParties) => {
      cy.fixture('validate-instantiation.json').then((validateInstantiationResponse) => {
        validateInstantiationResponse.validParties = allowedParties;
        cy.intercept('POST', `**/api/v1/parties/validateInstantiation?partyId=*`, {
          body: validateInstantiationResponse,
        });
      });
      cy.intercept('GET', `**/api/v1/parties?allowedtoinstantiatefilter=true`, {
        body: allowedParties,
      });
    });
    cy.intercept('**/active', []).as('noActiveInstances');
  });

  it('Reportee selection in data app', () => {
    cy.startAppInstance(appFrontend.apps.frontendTest);
    cy.get(appFrontend.reporteeSelection.appHeader).should('be.visible');
    cy.get(appFrontend.reporteeSelection.error).contains(texts.selectNewReportee);
    cy.get(appFrontend.reporteeSelection.seeSubUnits).click();
    cy.contains(appFrontend.reporteeSelection.subUnits, 'Bergen').should('be.visible');
    cy.contains(appFrontend.reporteeSelection.reportee, 'slettet').should('not.exist');
    cy.get(appFrontend.reporteeSelection.checkbox).eq(0).click();
    cy.contains(appFrontend.reporteeSelection.reportee, 'slettet').should('be.visible');
    cy.get(appFrontend.reporteeSelection.checkbox).eq(1).click();
    cy.get(appFrontend.reporteeSelection.seeSubUnits).should('not.exist');
    cy.get(appFrontend.reporteeSelection.searchReportee).type('DDG');
    cy.get(appFrontend.reporteeSelection.reportee).should('have.length', 1).contains('DDG');
  });
});

const fakeParty = {
  partyId: 12345678,
  partyTypeName: 1,
  orgNumber: '9879879876',
  ssn: '12312312345',
  unitType: null,
  name: 'Fake Party',
  isDeleted: false,
  onlyHierarchyElementWithNoAccess: false,
  person: null,
  organization: null,
  childParties: null,
};

describe('doNotPromptForParty doNotPromptForPartyPreference', () => {
  beforeEach(() => {
    // Enable feature toggle on the window object
    cy.on('window:before:load', (win) => {
      win.featureToggles = {
        doNotPromptForPartyPreference: true,
      };
    });
  });

  [true, false].forEach((doNotPromptForParty) => {
    it(`${
      doNotPromptForParty ? 'Does not prompt' : 'Prompts'
    } for party when doNotPromptForParty = ${doNotPromptForParty}, on instantiation with multiple possible parties`, () => {
      // Intercept active instances
      cy.intercept('**/active', []).as('noActiveInstances');

      // Intercept profile doNotPromptForPartyPreference
      cy.intercept('GET', '**/api/v1/profile/user', (req) => {
        req.on('response', (res) => {
          res.body.profileSettingPreference.doNotPromptForParty = doNotPromptForParty;
        });
      });

      // Intercept allowed parties
      cy.intercept('GET', `**/api/v1/parties?allowedtoinstantiatefilter=true`, (req) => {
        req.on('response', (res) => {
          res.body.push(fakeParty);
        });
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

        // Test that the message is not visible when going directly to party selection
        cy.reloadAndWait();
        cy.get('[id^="party-"]').should('be.visible');
        cy.findByRole('heading', { name: 'Hvorfor ser jeg dette?' }).should('not.exist');

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
      // Intercept active instances
      cy.intercept('**/active', []).as('noActiveInstances');

      // Intercept profile doNotPromptForPartyPreference
      cy.intercept('GET', '**/api/v1/profile/user', (req) => {
        req.on('response', (res) => {
          res.body.profileSettingPreference.doNotPromptForParty = doNotPromptForParty;
        });
      });

      // Intercept allowed parties
      cy.intercept('GET', `**/api/v1/parties?allowedtoinstantiatefilter=true`, {
        body: [fakeParty],
      });

      cy.startAppInstance(appFrontend.apps.frontendTest);
      cy.get(appFrontend.reporteeSelection.appHeader).should('be.visible');

      cy.findByRole('heading', { name: 'Appen for test av app frontend' }).should('be.visible');
      cy.get('[id^="party-"]').should('not.exist');
    });
  });

  [
    { doNotPromptForPartyPreference: true, appPromptForPartyOverride: 'always' },
    { doNotPromptForPartyPreference: false, appPromptForPartyOverride: 'never' },
  ].forEach(({ doNotPromptForPartyPreference, appPromptForPartyOverride }) => {
    it(`Correctly overrides the profile doNotPromptForPartyPreference when doNotPromptForPartyPreference=${doNotPromptForPartyPreference} and appPromptForPartyOverride=${appPromptForPartyOverride}`, () => {
      // Intercept active instances
      cy.intercept('**/active', []).as('noActiveInstances');

      // Intercept profile doNotPromptForPartyPreference
      cy.intercept('GET', '**/api/v1/profile/user', (req) => {
        req.on('response', (res) => {
          res.body.profileSettingPreference.doNotPromptForParty = doNotPromptForPartyPreference;
        });
      });

      cy.intercept('GET', '**/applicationmetadata', (req) => {
        req.on('response', (res) => {
          res.body.promptForParty = appPromptForPartyOverride;
        });
      });

      cy.startAppInstance(appFrontend.apps.frontendTest);
      cy.get(appFrontend.reporteeSelection.appHeader).should('be.visible');

      if (appPromptForPartyOverride === 'always') {
        cy.get('[id^="party-"]').should('be.visible');
        cy.findByRole('heading', { name: 'Hvorfor ser jeg dette?' }).should('be.visible');
        cy.findByRole('heading', { name: 'Hvorfor ser jeg dette?' })
          .siblings('p')
          .first()
          .should('contain.text', 'Denne appen er satt opp til å alltid spørre om aktør.');
        cy.findByRole('heading', { name: 'Appen for test av app frontend' }).should('not.exist');

        // Test that the message is not visible when going directly to party selection
        cy.reloadAndWait();
        cy.get('[id^="party-"]').should('be.visible');
        cy.findByRole('heading', { name: 'Hvorfor ser jeg dette?' }).should('not.exist');

        cy.get('[id^="party-"]').eq(0).click();
      }

      cy.findByRole('heading', { name: 'Appen for test av app frontend' }).should('be.visible');
      cy.get('[id^="party-"]').should('not.exist');
      cy.findByRole('heading', { name: 'Hvorfor ser jeg dette?' }).should('not.exist');
    });
  });
});
