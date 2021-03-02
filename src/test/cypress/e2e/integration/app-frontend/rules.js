/// <reference types='cypress' />

import AppFrontend from '../../pageobjects/app-frontend';

const appName = Cypress.env('localTestAppName');
const appFrontend = new AppFrontend();

describe('Rules', () => {
  before(() => {
    cy.navigateToChangeName(appName);
  });

  it('Rule is run and new name is a concatenated string', () => {
    cy.get(appFrontend.changeOfName.newFirstName).type('automation');
    cy.get(appFrontend.changeOfName.newMiddleName).type('is');
    cy.get(appFrontend.changeOfName.newLastName).type('fun').then(() => {
      cy.get(appFrontend.changeOfName.newFullName).focus()
        .should('have.value', 'automation is fun');
    });
  });

});
