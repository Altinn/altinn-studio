/// <reference types='cypress' />
/// <reference types="../../support" />

import Common from '../../pageobjects/common';
import AppFrontend from '../../pageobjects/app-frontend';
import * as texts from '../../fixtures/texts.json';

const appFrontend = new AppFrontend();
const mui = new Common();

describe('Redirect', () => {
  it('User missing role to start the app is displayed', () => {
    cy.intercept('POST', `/ttd/frontend-test/instances?instanceOwnerPartyId*`, {
      statusCode: 403,
    });
    cy.startAppInstance(Cypress.env('multiData2Stage'));
    cy.get(mui.caption).should('have.text', 'Feil 403');
    cy.get(appFrontend.altinnError).should('contain.text', texts.missingRights);
  });

  it.only('Unknown error page', () => {
    cy.intercept('GET', `**/applicationmetadata`, {
      statusCode: 401,
    });
    cy.startAppInstance(Cypress.env('multiData2Stage'));
    cy.get(mui.caption).should('have.text', 'Ukjent feil');
    cy.get(appFrontend.altinnError).should('contain.text', texts.tryAgain);
  });
});
