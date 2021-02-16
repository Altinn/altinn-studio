/// <reference types='cypress' />

import AppFrontend from '../../pageobjects/app-frontend';

const appName = Cypress.env('localTestAppName');
const af = new AppFrontend();

describe('Tabbing', () => {
  before(() => {
    cy.navigateToChangeName(appName);
  });

  //Tests that it is possible for an user to tab through the fiels of the change name form
  it('Tab through the fiels in change name form', () => {
    cy.get(af.changeOfName.newFirstName).focus().tab();
    cy.focused().should('have.attr', 'id').and('eq', af.changeOfName.newLastName.substr(1));
    cy.get(af.changeOfName.newLastName).type('a').tab().tab().tab();
    cy.focused().should('have.value', 'a')
      .should('have.attr', 'id')
      .and('eq', af.changeOfName.newFullName.substr(1));
    cy.tab().tab().tab({ shift: true });
    cy.focused().should('have.attr', 'type').and('eq', 'checkbox');
  });

});