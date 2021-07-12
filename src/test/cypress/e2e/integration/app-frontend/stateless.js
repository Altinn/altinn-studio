/// <reference types='cypress' />
/// <reference types="../../support" />

import AppFrontend from '../../pageobjects/app-frontend';

const appFrontend = new AppFrontend();

describe('Stateless', () => {
  beforeEach(() => {
    cy.startAppInstance(Cypress.env('stateless'));
    cy.get(appFrontend.stateless.name).should('exist').and('be.visible');
  });

  it('Prefill from Register and data processing', () => {
    cy.get(appFrontend.closeButton).should('not.exist');
    cy.get(appFrontend.stateless.name).invoke('val').should('not.be.empty');
    cy.get(appFrontend.stateless.number).should('have.value', '1364');
    cy.get(appFrontend.stateless.name).clear().type('test').blur();
    cy.get(appFrontend.stateless.name).should('have.value', 'automation');
  });

  it('Dynamics in stateless app', () => {
    cy.get(appFrontend.stateless.name).clear().type('automation').blur();
    cy.get(appFrontend.stateless.idnummer2).should('exist').and('be.visible');
    cy.get(appFrontend.stateless.name).clear().type('abc').blur();
    cy.get(appFrontend.stateless.idnummer2).should('not.exist');
  });
});
