/// <reference types='cypress' />
import AppFrontend from '../pageobjects/app-frontend';
import Common from '../pageobjects/common';
import * as texts from '../fixtures/texts.json';

const baseUrl = Cypress.env('localTestBaseUrl');
const af = new AppFrontend();
const mui = new Common();

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

/**
 * Complete change name form and navigate to summary page
 */
Cypress.Commands.add('completeChangeNameForm', (firstName, lastName) => {
  cy.get(af.changeOfName.currentName).should('be.visible').then(() => {
    cy.get(af.changeOfName.newFirstName).type(firstName);
    cy.get(af.changeOfName.newLastName).type(lastName);
    cy.get(af.changeOfName.confirmChangeName).find('input').check();
    cy.get(af.changeOfName.reasonRelationship).click().type('test');
    cy.get(af.changeOfName.dateOfEffect).siblings().children(mui.buttonIcon).click().then(() => {
      cy.get(mui.selectedDate).click();
    });
    cy.contains(mui.button, texts.next).click();
  })
});