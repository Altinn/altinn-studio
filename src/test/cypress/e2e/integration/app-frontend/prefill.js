/// <reference types='cypress' />

import AppFrontend from '../../pageobjects/app-frontend';

const appName = Cypress.env('localTestAppName');
const af = new AppFrontend();

describe('Prefill', () => {
  before(() => {
    cy.navigateToChangeName(appName);
  });

  //Tests that field is populated with the user name and the field is readonly
  it('Check Prefill and readonly input', () => {
    cy.get(af.changeOfName.currentName).then((name) => {
      cy.get(name).should('be.visible')
        .and('have.value', 'Ola Nordmann')
        .and('have.attr', 'readonly');
    });
  });

});