/// <reference types='cypress' />
/// <reference types="../../support" />

import AppFrontend from '../../pageobjects/app-frontend';

const appFrontend = new AppFrontend();

describe('Prefill', () => {
  before(() => {
    cy.navigateToChangeName();
  });

  it('Check Prefill from register and readonly input', () => {
    var currentName = Cypress.env('userFullName');
    cy.get(appFrontend.changeOfName.currentName).then((name) => {
      cy.get(name).should('be.visible').and('have.value', currentName).and('have.attr', 'readonly');
    });
  });
});
