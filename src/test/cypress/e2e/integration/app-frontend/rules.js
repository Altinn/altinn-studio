/// <reference types='cypress' />
/// <reference types="../../support" />

import AppFrontend from '../../pageobjects/app-frontend';

const appFrontend = new AppFrontend();

describe('Rules', () => {
  it('Rule is run and new name is a concatenated string', () => {
    cy.navigateToChangeName();
    cy.get(appFrontend.changeOfName.newFirstName).type('automation');
    cy.get(appFrontend.changeOfName.newMiddleName).type('is');
    cy.get(appFrontend.changeOfName.newLastName)
      .type('fun')
      .then(() => {
        cy.get(appFrontend.changeOfName.newFullName).focus().should('have.value', 'automation is fun');
      });
  });
});
