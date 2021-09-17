/// <reference types='cypress' />
/// <reference types="../../support" />

import AppFrontend from '../../pageobjects/app-frontend';

const appFrontend = new AppFrontend();

describe('Prefill', () => {
  it('Check Prefill from register and readonly input', () => {
    cy.navigateToChangeName();
    cy.get(appFrontend.changeOfName.currentName).then((name) => {
      cy.get(name).should('be.visible').and('have.value', Cypress.env('userFullName')).and('have.attr', 'readonly');
    });
  });
});
