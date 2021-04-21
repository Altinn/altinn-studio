/// <reference types='cypress' />
/// <reference types="../../support" />

import AppFrontend from '../../pageobjects/app-frontend';

const appFrontend = new AppFrontend();

describe('Dynamics', () => {
  before(() => {
    cy.navigateToChangeName();
  });
  beforeEach(() => {
    cy.preserveCookies();
  });

  it('Show and hide confirm name change checkbox on changing firstname', () => {
    cy.get(appFrontend.changeOfName.newFirstName)
      .type('test')
      .then(() => {
        cy.get(appFrontend.changeOfName.newMiddleName).focus();
        cy.get(appFrontend.changeOfName.confirmChangeName).should('be.visible');
      });
    cy.get(appFrontend.changeOfName.newFirstName)
      .clear()
      .then(() => {
        cy.get(appFrontend.changeOfName.newMiddleName).focus();
        cy.get(appFrontend.changeOfName.confirmChangeName).should('not.exist');
      });
  });

  it('Show and hide name change reasons radio buttons', () => {
    cy.get(appFrontend.changeOfName.newFirstName).type('test');
    cy.get(appFrontend.changeOfName.newLastName).type('test');
    cy.get(appFrontend.changeOfName.confirmChangeName).find('input').check();
    cy.get(appFrontend.changeOfName.reasons).should('be.visible');
  });
});
