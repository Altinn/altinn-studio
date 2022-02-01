/// <reference types='cypress' />
/// <reference types="../../support" />

import AppFrontend from '../../pageobjects/app-frontend';

const appFrontend = new AppFrontend();

describe('Dynamics', () => {
  beforeEach(() => {
    cy.navigateToChangeName();
  });

  it('Show and hide confirm name change checkbox on changing firstname', () => {
    cy.get(appFrontend.changeOfName.newFirstName)
      .should('be.visible')
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
    cy.get(appFrontend.changeOfName.newFirstName).should('be.visible').type('test');
    cy.get(appFrontend.changeOfName.newLastName).should('be.visible').type('test');
    cy.get(appFrontend.changeOfName.confirmChangeName).should('be.visible').find('input').check();
    cy.get(appFrontend.changeOfName.reasons).should('be.visible');
  });

  /* it('is possible to retrieve options dynamically', () => {
    cy.get(appFrontend.changeOfName.sources).should('be.visible');
    cy.get(appFrontend.changeOfName.reference).should('be.visible');
    cy.get(appFrontend.changeOfName.reference).find('option[value="nordmann"]').should('exist').select();
  }); */
});
