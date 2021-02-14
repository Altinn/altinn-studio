/// <reference types='cypress' />

import * as af from '../../pageobjects/app-frontend';

const appName = Cypress.env('localTestAppName');

describe('Prefill', () => {
  before(() => {
    cy.visit(Cypress.env('localTestBaseUrl'));
    cy.get(af.appSelection).select(appName);
    cy.get(af.startButton).click();
    cy.get(af.closeButton).should('be.visible');
    cy.get(af.sendinButton).then((button) => {
      cy.get(button).should('be.visible')
        .click();
    })
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