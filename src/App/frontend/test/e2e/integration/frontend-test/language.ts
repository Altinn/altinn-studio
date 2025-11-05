import { AppFrontend } from 'test/e2e/pageobjects/app-frontend';

const profileResponse = {
  body: {
    userId: 10000,
    userName: 'user-90155202001',
    externalIdentity: null,
    phoneNumber: null,
    email: 'mandolin.sentral@altinnstudiotestusers.com',
    partyId: 600000,
    party: {
      partyId: 600000,
      partyTypeName: 'person',
      orgNumber: null,
      ssn: '09844797998',
      unitType: null,
      name: 'SENTRAL MANDOLIN',
      isDeleted: false,
      onlyHierarchyElementWithNoAccess: false,
      person: {
        ssn: '09844797998',
        name: 'SENTRAL MANDOLIN',
        firstName: 'SENTRAL',
        middleName: null,
        lastName: 'MANDOLIN',
        telephoneNumber: null,
        mobileNumber: null,
        mailingAddress: null,
        mailingPostalCode: null,
        mailingPostalCity: null,
        addressMunicipalNumber: '3820',
        addressMunicipalName: null,
        addressStreetName: null,
        addressHouseNumber: '95',
        addressHouseLetter: '1001',
        addressPostalCode: null,
        addressCity: 'SELJORD',
        dateOfDeath: null,
      },
      organization: null,
      childParties: null,
    },
    userType: 'none',
    profileSettingPreference: {
      language: null,
      preSelectedPartyId: 0,
      doNotPromptForParty: false,
    },
  },
};

const appFrontend = new AppFrontend();

describe('Language', () => {
  it('should not crash if language is not specified', () => {
    cy.intercept('GET', '**/profile/user', profileResponse).as('profile');
    cy.intercept('GET', '**/texts/nb').as('texts');

    cy.goto('changename');

    cy.wait('@profile');
    cy.wait('@texts');

    cy.waitForLoad();
    cy.findByRole('heading', { name: 'Ukjent feil' }).should('not.exist');
  });

  it('should not crash if language is stored as "null" in local storage', () => {
    cy.intercept('GET', '**/profile/user', profileResponse).as('profile');
    cy.intercept('GET', '**/texts/nb').as('texts');

    cy.goto('changename').then(() => {
      window.localStorage.setItem('selectedAppLanguagefrontend-test10000', 'null');
    });

    cy.wait('@profile');
    cy.wait('@texts');

    cy.waitForLoad();
    cy.findByRole('heading', { name: 'Ukjent feil' }).should('not.exist');
  });

  it('should be possible to change language with arrow keys and space', () => {
    cy.intercept('GET', '**/texts/en').as('texts');

    cy.goto('changename');
    cy.get(appFrontend.languageSelector).click();
    cy.press('Tab');
    cy.focused().should('contain.text', 'Norsk bokmål');
    cy.press('ArrowUp');
    cy.focused().should('contain.text', 'Engelsk');
    cy.press('Space');

    cy.waitForLoad();
    cy.wait('@texts');
  });
});
