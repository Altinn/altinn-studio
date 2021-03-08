/// <reference types='cypress' />

import AppFrontend from '../../pageobjects/app-frontend';

const appName = Cypress.env('localTestAppName');
const appFrontend = new AppFrontend();

describe('Tabbing', () => {
  before(() => {
    cy.navigateToChangeName(appName);
  });

  it('Tab through the fiels in change name form', () => {
    cy.get(appFrontend.changeOfName.newFirstName).focus().tab();
    cy.focused().should('have.attr', 'id').and('eq', appFrontend.changeOfName.newLastName.substr(1));
    cy.get(appFrontend.changeOfName.newLastName).type('a').tab().tab().tab();
    cy.focused().should('have.value', 'a')
      .should('have.attr', 'id')
      .and('eq', appFrontend.changeOfName.newFullName.substr(1));
    cy.tab().tab().tab({
      shift: true
    });
    cy.focused().should('have.attr', 'type').and('eq', 'checkbox');
  });

});
