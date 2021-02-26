/// <reference types='cypress' />

import AppFrontend from '../../pageobjects/app-frontend';

const appName = Cypress.env('localTestAppName');
const appFrontend = new AppFrontend();

describe('Prefill', () => {
  before(() => {
    cy.navigateToChangeName(appName);
  });

  it('Check Prefill from register and readonly input', () => {
    cy.get(appFrontend.changeOfName.currentName).then((name) => {
      cy.get(name).should('be.visible')
        .and('have.value', 'Ola Nordmann')
        .and('have.attr', 'readonly');
    });
  });

});
