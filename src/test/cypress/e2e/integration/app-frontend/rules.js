/// <reference types='cypress' />

import AppFrontend from '../../pageobjects/app-frontend';

const appName = Cypress.env('localTestAppName');
const af = new AppFrontend();

describe('Rules', () => {
  before(() => {
    cy.navigateToChangeName(appName);
  });

  //Tests that rules defined in rulehandler is run and output is reflected in frontend
  it('Rule is run and new name is a concatenated string', () => {
    cy.get(af.changeOfName.newFirstName).type('automation');
    cy.get(af.changeOfName.newMiddleName).type('is');
    cy.get(af.changeOfName.newLastName).type('fun').then(() => {
      cy.get(af.changeOfName.newFullName).focus()
        .should('have.value', 'automation is fun');
    });
  });

});