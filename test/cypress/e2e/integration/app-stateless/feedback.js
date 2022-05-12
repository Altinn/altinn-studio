/// <reference types='cypress' />
/// <reference types="../../support" />

import AppFrontend from '../../pageobjects/app-frontend';
import * as texts from '../../fixtures/texts.json';

const appFrontend = new AppFrontend();

describe('Feedback', () => {
  beforeEach(() => {
    cy.intercept('**/api/layoutsettings/stateless').as('getLayoutStateless');
    cy.startAppInstance(Cypress.env('stateless'));
    cy.wait('@getLayoutStateless');
    cy.get(appFrontend.stateless.name).should('exist').and('be.visible');
  });

  it('is possible to move app instance to feedback stage', () => {
    cy.startStateFullFromStateless();
    cy.intercept('PUT', '**/process/next').as('nextProcess');
    cy.get(appFrontend.sendinButton).should('be.visible').click();
    cy.wait('@nextProcess').its('response.statusCode').should('eq', 200);
    cy.get(appFrontend.feedback).should('be.visible').and('contain.text', texts.feedback);
  });
});
