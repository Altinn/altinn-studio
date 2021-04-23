/// <reference types="cypress" />
import * as loginPage from '../pageobjects/loginandreg';
import * as dashboard from '../pageobjects/dashboard';
import * as designer from '../pageobjects/designer';

/**
 * Login to studio with user name and password
 */
Cypress.Commands.add('studiologin', (userName, userPwd) => {
  cy.get(loginPage.loginButton).click();
  cy.get(loginPage.userName).type(userName);
  cy.get(loginPage.userPwd).type(userPwd);
  cy.get(loginPage.submit).click();
});

/**
 * create an app in studio with user logged in and in dashboard
 */
Cypress.Commands.add('createapp', (orgName, appName) => {
  cy.get(dashboard.newApp).click();
  cy.get(dashboard.appOwners).click();
  cy.contains(dashboard.appOwnersList, orgName).click();
  cy.get(dashboard.appName).type(appName);
  cy.intercept('POST', '**/designerapi/Repository/CreateApp**').as('postCreateApp');
  cy.get(dashboard.button).contains(dashboard.createApp).click();
  cy.wait('@postCreateApp', { timeout: 20000 }).its('response.statusCode').should('eq', 200);
});

/**
 * Delete all the added components in ux-editor
 */
Cypress.Commands.add('deletecomponents', () => {
  cy.get(designer.dragToArea)
    .parent()
    .siblings()
    .find(designer.draggable)
    .then(($component) => {
      if ($component.length > 0 && $component.text().indexOf('Tomt, dra noe inn her...') === -1) {
        cy.get($component).each(($el) => {
          cy.wrap($el).click();
        });
        cy.get(designer.deleteComponent).parents('button').click();
      }
    });
});
