/// <reference types='cypress' />
/// <reference types="../../support" />

import AppFrontend from '../../pageobjects/app-frontend';

const appFrontend = new AppFrontend();

describe('WCAG', () => {
  it('WCAG test in stateless app', () => {
    cy.startAppInstance(Cypress.env('stateless'));
    cy.get(appFrontend.stateless.name).should('exist').and('be.visible');
    cy.testWcag();
  });
});
