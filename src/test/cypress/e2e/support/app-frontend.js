/// <reference types='cypress' />
import * as af from '../pageobjects/app-frontend';

const baseUrl = Cypress.env('localTestBaseUrl');

/**
 * Start app instance of frontend-test and navigate to change name layout in task_2
 */
Cypress.Commands.add('navigateToChangeName', (appName) => {
  cy.visit(baseUrl);
  cy.get(af.appSelection).select(appName);
  cy.get(af.startButton).click();
  cy.get(af.closeButton).should('be.visible');
  cy.get(af.sendinButton).then((button) => {
    cy.get(button).should('be.visible')
      .click();
  })
});

/**
 * Preserve cookies between testes making reuse of instance across multiple tests in a file
 */
Cypress.Commands.add('preserveCookies', () => {
  Cypress.Cookies.preserveOnce('AltinnStudioRuntime', 'AltinnPartyId', 'XSRF-TOKEN', 'AS-XSRF-TOKEN');
});