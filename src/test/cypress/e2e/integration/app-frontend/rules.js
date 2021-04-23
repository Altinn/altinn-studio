/// <reference types='cypress' />
/// <reference types="../../support" />

import AppFrontend from '../../pageobjects/app-frontend';

const appFrontend = new AppFrontend();

describe('Rules', () => {
  before(() => {
    cy.navigateToChangeName();
  });

  it('Rule is run and new name is a concatenated string', () => {
    cy.get(appFrontend.changeOfName.newFirstName).type('automation');
    cy.get(appFrontend.changeOfName.newMiddleName).type('is');
    cy.get(appFrontend.changeOfName.newLastName)
      .type('fun')
      .then(() => {
        cy.get(appFrontend.changeOfName.newFullName).focus().should('have.value', 'automation is fun');
      });
  });
});
