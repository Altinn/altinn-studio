/// <reference types='cypress' />

import * as af from '../../pageobjects/app-frontend';

const appName = Cypress.env('localTestAppName');

describe('Dynamics', () => {
  before(() => {
    cy.visit(Cypress.env('localTestBaseUrl'));
    cy.get(af.appSelection).select(appName);
    cy.get(af.startButton).click();
    cy.get(af.closeButton).should('be.visible');
    cy.get(af.sendinButton).then((button) => {
      cy.get(button).should('be.visible')
        .click();
    })
  });
  beforeEach(() => {
    Cypress.Cookies.preserveOnce('AltinnStudioRuntime', 'AltinnPartyId', 'XSRF-TOKEN', 'AS-XSRF-TOKEN');
  });

  //Tests that checkbox to confirm name is shown and hidden when firstname field is changed
  it('Show and hide confirm name change checkbox', () => {
    cy.get(af.changeOfName.newFirstName).type('test').then(() => {
      cy.get(af.changeOfName.newMiddleName).focus();
      cy.get(af.changeOfName.confirmChangeName).should('be.visible');
    });
    cy.get(af.changeOfName.newFirstName).clear().then(() => {
      cy.get(af.changeOfName.newMiddleName).focus();
      cy.get(af.changeOfName.confirmChangeName).should('not.exist');
    });
  });

  //Tests that reasons options are shown and hidden based on the selected reason
  it('Show and hide name change reasons', () => {
    cy.get(af.changeOfName.newFirstName).type('test');
    cy.get(af.changeOfName.newLastName).type('test');
    cy.get(af.changeOfName.confirmChangeName).find('input').check();
    cy.get(af.changeOfName.reasons).should('be.visible');
  });

});