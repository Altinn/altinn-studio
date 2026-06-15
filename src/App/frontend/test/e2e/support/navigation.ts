import { AppFrontend } from 'test/e2e/pageobjects/app-frontend';
import type { FrontendTestTask } from 'test/e2e/support/global';

const appFrontend = new AppFrontend();

function initAndGoto(nextTask?: string) {
  cy.intercept('**/active', []).as('noActiveInstances');
  cy.startAppInstance(appFrontend.apps.frontendTest);
  cy.get('#finishedLoading').should('exist');

  if (nextTask) {
    cy.findByRole('button', { name: 'Velg neste steg' }).click();
    cy.findByRole('radio', { name: nextTask }).click();
    cy.findByRole('button', { name: 'Gå til' }).click();
    cy.get('#finishedLoading').should('exist');
  }
}

/**
 * Functions used by goto() to quickly pretend to fill out a certain layout.
 * These should always complete the task fully, i.e. end the task and move to the next one after it.
 * It never generates a PDF for the previous tasks.
 */
const gotoFunctions: { [key in FrontendTestTask]: () => void } = {
  message: () => initAndGoto(),
  changename: () => initAndGoto('Endring av navn (Task_2)'),
  group: () => initAndGoto('Repeterende grupper (Task_3)'),
  likert: () => initAndGoto('Likert (Task_4)'),
  datalist: () => initAndGoto('List (Task_5)'),
};

Cypress.Commands.add('goto', (task) => {
  gotoFunctions[task]();
  cy.findByRole('progressbar').should('not.exist');
});

Cypress.Commands.add('gotoHiddenPage', (target) => {
  gotoFunctions.changename();
  cy.findByRole('progressbar').should('not.exist');
  cy.get(appFrontend.changeOfName.newFirstName).type('a');
  cy.findByRole('tab', { name: /nytt etternavn/i }).click();
  cy.get(appFrontend.changeOfName.newLastName).type('a');
  cy.get(appFrontend.changeOfName.confirmChangeName)
    .findByRole('checkbox', { name: /Ja[a-z, ]*/ })
    .check();
  cy.get(`[type=checkbox][name=choose-extra][value=${target}]`).check();
  cy.gotoNavPage(target);
});
