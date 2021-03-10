/// <reference types='cypress' />
import AppFrontend from '../pageobjects/app-frontend';
import Common from '../pageobjects/common';
import * as texts from '../fixtures/texts.json';

const baseUrl = Cypress.env('localTestBaseUrl');
const appFrontend = new AppFrontend();
const mui = new Common();

/**
 * Start app instance of frontend-test and navigate to change name layout in task_2
 */
Cypress.Commands.add('navigateToChangeName', (appName) => {
  cy.visit(baseUrl);
  cy.get(appFrontend.appSelection).select(appName);
  cy.get(appFrontend.startButton).click();
  cy.get(appFrontend.closeButton).should('be.visible');
  cy.get(appFrontend.sendinButton).then((button) => {
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

/**
 * Complete change name form and navigate to summary page
 */
Cypress.Commands.add('completeChangeNameForm', (firstName, lastName) => {
  cy.get(appFrontend.changeOfName.currentName).should('be.visible').then(() => {
    cy.get(appFrontend.changeOfName.newFirstName).type(firstName);
    cy.get(appFrontend.changeOfName.newLastName).type(lastName);
    cy.get(appFrontend.changeOfName.confirmChangeName).find('input').check();
    cy.get(appFrontend.changeOfName.reasonRelationship).click().type('test');
    cy.get(appFrontend.changeOfName.dateOfEffect).siblings().children(mui.buttonIcon).click().then(() => {
      cy.get(mui.selectedDate).click();
    });
    cy.contains(mui.button, texts.next).click();
  })
});
