import { AppFrontend } from 'test/e2e/pageobjects/app-frontend';
import type { FrontendTestTask, StartAppInstanceOptions } from 'test/e2e/support/global';

const appFrontend = new AppFrontend();

/**
 * Functions used by goto() to quickly pretend to fill out a certain layout.
 * These should always complete the task fully, i.e. end the task and move to the next one after it.
 * It never generates a PDF for the previous tasks.
 */
const gotoFunctions: { [key in FrontendTestTask]: (startOptions?: StartAppInstanceOptions) => void } = {
  message: (startOptions?: StartAppInstanceOptions) => {
    cy.intercept('**/active', []).as('noActiveInstances');
    cy.startAppInstance(appFrontend.apps.frontendTest, startOptions);
    cy.findByRole('link', { name: /tilbake til innboks/i }).should('be.visible');
  },
  changename: (startOptions?: StartAppInstanceOptions) => {
    cy.startAppInstance(appFrontend.apps.frontendTest, startOptions);

    // Click the task chooser button if it exists
    cy.get('#custom-button-taskChooserButton').should('exist').click();
    // Click the radio button for "Endring av navn (Task_2)"
    cy.findByRole('radio', { name: 'Endring av navn (Task_2)' }).should('exist').click();

    cy.get('#sendInButtonOnTaskChooser').should('exist').click();
  },
  group: (startOptions?: StartAppInstanceOptions) => {
    cy.startAppInstance(appFrontend.apps.frontendTest, startOptions);

    cy.get('#custom-button-taskChooserButton').should('exist').click();
    // Click the radio button for "Endring av navn (Task_2)"
    cy.findByRole('radio', { name: 'Repeterende grupper (Task_3)' }).should('exist').click();
    cy.get('#sendInButtonOnTaskChooser').should('exist').click();
  },
  likert: (startOptions?: StartAppInstanceOptions) => {
    cy.startAppInstance(appFrontend.apps.frontendTest, startOptions);

    cy.get('#custom-button-taskChooserButton').should('exist').click();
    // Click the radio button for "Endring av navn (Task_2)"
    cy.findByRole('radio', { name: 'Likert (Task_4)' }).should('exist').click();
    cy.get('#sendInButtonOnTaskChooser').should('exist').click();
  },
  datalist: (startOptions?: StartAppInstanceOptions) => {
    cy.startAppInstance(appFrontend.apps.frontendTest, {
      ...startOptions,
    });

    cy.get('#custom-button-taskChooserButton').should('exist').click();
    cy.findByRole('radio', { name: 'List (Task_5)' }).should('exist').click();
    cy.get('#sendInButtonOnTaskChooser').should('exist').click();
  },
};

Cypress.Commands.add('goto', (task, options) => {
  gotoFunctions[task](options);
  cy.findByRole('progressbar').should('not.exist');
});

Cypress.Commands.add('gotoHiddenPage', (target) => {
  cy.goto('changename');
  cy.findByRole('progressbar').should('not.exist');
  cy.get('#finishedLoading').should('exist');
  cy.get(appFrontend.changeOfName.newFirstName).type('a');
  cy.get(`input[name="choose-extra"][value="${target}"]`).click();
  cy.get('#navigation-menu button').eq(1).should('not.contain.text', 'summary').click();
  cy.get(appFrontend.changeOfName.newFirstName).should('not.exist');
});
