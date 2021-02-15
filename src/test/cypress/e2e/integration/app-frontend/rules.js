/// <reference types='cypress' />

import * as af from '../../pageobjects/app-frontend';

const appName = Cypress.env('localTestAppName');

describe('Rules', () => {
  before(() => {
    cy.navigateToChangeName(appName);
  });

  //Tests that rules defined in rulehandler is run and output is reflected in frontend
  it('Rule is run and new name is a concatenated string', () => {
    cy.get(af.changeOfName.newFirstName).type('test');
    cy.get(af.changeOfName.newMiddleName).type('is');
    cy.get(af.changeOfName.newLastName).type('fun').then(() => {
      cy.get(af.changeOfName.newFullName).focus()
        .should('have.value', 'test is fun');
    });
  });

});