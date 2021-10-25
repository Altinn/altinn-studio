/// <reference types='cypress' />
import AppFrontend from '../pageobjects/app-frontend';
import Common from '../pageobjects/common';
import * as texts from '../fixtures/texts.json';

const appFrontend = new AppFrontend();
const mui = new Common();

/**
 * Start app instance of frontend-test and navigate to change name layout in task_2
 */
Cypress.Commands.add('navigateToChangeName', () => {
  cy.intercept('**/active', []).as('noActiveInstances');
  cy.startAppInstance(Cypress.env('multiData2Stage'));
  cy.get(appFrontend.closeButton).should('be.visible');
  cy.intercept('**/api/layoutsettings/changename').as('getLayoutChangeName');
  cy.get(appFrontend.sendinButton).then((button) => {
    cy.get(button).should('be.visible').click();
    cy.wait('@getLayoutChangeName');
  });
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
  cy.get(appFrontend.changeOfName.currentName)
    .should('be.visible')
    .then(() => {
      cy.get(appFrontend.changeOfName.newFirstName).should('be.visible').type(firstName).blur();
      cy.get(appFrontend.changeOfName.newLastName).should('be.visible').type(lastName).blur();
      cy.get(appFrontend.changeOfName.confirmChangeName).should('be.visible').find('input').check();
      cy.get(appFrontend.changeOfName.reasonRelationship).should('be.visible').click().type('test');
      cy.get(appFrontend.changeOfName.dateOfEffect)
        .siblings()
        .children(mui.buttonIcon)
        .click()
        .then(() => {
          cy.get(mui.selectedDate).should('be.visible').click();
        });
      cy.contains(mui.button, texts.next).click();
    });
});

/**
 * Navigate to the task3 of app ttd/frontend-test
 */
Cypress.Commands.add('navigateToTask3', () => {
  cy.navigateToChangeName();
  cy.completeChangeNameForm('a', 'a');
  cy.intercept('**/api/layoutsettings/group').as('getLayoutGroup');
  cy.get(appFrontend.sendinButton).should('be.visible').click();
  cy.wait('@getLayoutGroup');
});

/**
 * Fill in and complete task 3 form
 */
Cypress.Commands.add('compelteTask3Form', () => {
  cy.navigateToTask3();
  cy.get(appFrontend.group.showGroupToContinue).then((checkbox) => {
    cy.get(checkbox).should('be.visible').find('input').check();
  });
  cy.addItemToGroup(1, 2, 'automation');
  cy.contains(mui.button, texts.next).click();
  cy.get(appFrontend.group.sendersName).should('be.visible').type('automation');
  cy.contains(mui.button, texts.next).click();
  cy.get(appFrontend.group.summaryText).should('be.visible');
});

Cypress.Commands.add('navigateToTask4', () => {
  cy.compelteTask3Form();
  cy.get(appFrontend.sendinButton).should('be.visible').click();
  cy.get(appFrontend.confirmContainer).should('be.visible');
});

Cypress.Commands.add('addItemToGroup', (oldValue, newValue, comment) => {
  cy.get(appFrontend.group.addNewItem).should('be.visible').focus().click();
  cy.get(appFrontend.group.currentValue).should('be.visible').type(oldValue).blur();
  cy.get(appFrontend.group.newValue).should('be.visible').type(newValue).blur();
  cy.get(appFrontend.group.mainGroup)
    .siblings(appFrontend.group.editContainer)
    .find(appFrontend.group.next)
    .should('be.visible')
    .click();
  cy.get(appFrontend.group.addNewItem).should('be.visible').focus().click();
  cy.get(appFrontend.group.comments).type(comment).blur();
  cy.get(appFrontend.group.saveSubGroup).should('be.visible').click().should('not.exist');
  cy.get(appFrontend.group.saveMainGroup).should('be.visible').click().should('not.exist');
});

Cypress.Commands.add('testWcag', () => {
  cy.injectAxe();
  cy.checkA11y(
    null,
    {
      includedImpacts: ['critical', 'serious', 'moderate'],
    },
    null,
    { skipFailures: true },
  );
});
