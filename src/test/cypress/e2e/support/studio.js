/// <reference types="cypress" />
import { login } from '../pageobjects/loginandreg';
import { dashboard } from '../pageobjects/dashboard';
import { designer } from '../pageobjects/designer';

/**
 * Login to studio with user name and password
 */
Cypress.Commands.add('studiologin', (userName, userPwd) => {
  cy.get(login.loginButton).should('be.visible').click();
  cy.get(login.userName).should('be.visible').type(userName);
  cy.get(login.userPwd).should('be.visible').type(userPwd, { log: false });
  cy.get(login.submit).should('be.visible').click();
});

/**
 * create an app in studio with user logged in and in dashboard
 */
Cypress.Commands.add('createapp', (orgName, appName) => {
  cy.get(dashboard.newApp).should('be.visible').click();
  cy.get(dashboard.appOwners).should('be.visible').click();
  cy.contains(dashboard.appOwnersList, orgName).click();
  cy.get(dashboard.appName).should('be.visible').type(appName);
  cy.intercept('POST', '**/designer/api/v1/repos/**').as('postCreateApp');
  cy.contains(dashboard.button, dashboard.createApp).should('be.visible').click();
  cy.wait('@postCreateApp', { timeout: 30000 }).its('response.statusCode').should('eq', 201);
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
        cy.get(designer.deleteComponent).parents('button').click({ multiple: true, force: true });
      }
    });
});

/**
 * Delete local changes of an app for a logged in user
 */
Cypress.Commands.add('deleteLocalChanges', (appId) => {
  cy.getCookie('AltinnStudioDesigner').should('exist');
  cy.intercept(/(s|RepoS)tatus/).as('repoStatus');
  cy.visit(`designer/${appId}#/about`);
  // eslint-disable-next-line cypress/no-unnecessary-waiting
  cy.wait(5000);
  cy.wait('@repoStatus');
  cy.get(designer.aboutApp.repoName).should('be.visible');
  cy.get(designer.sideMenu)
    .find(designer.deleteChanges.reset)
    .should(($button) => {
      expect(Cypress.dom.isDetached($button), 'button should not be detached').to.eq(false);
    })
    .should('be.visible')
    .click();
  cy.get(designer.deleteChanges.name)
    .should('be.visible')
    .type(`${appId.split('/')[1]}`)
    .blur();
  cy.intercept('GET', '**/reset').as('resetRepo');
  cy.get(designer.deleteChanges.confirm).should('be.visible').click();
  cy.wait('@resetRepo');
  cy.get(designer.deleteChanges.name).should('not.exist');
});

/**
 * Get body of an iframe document
 */
Cypress.Commands.add('getIframeBody', () => {
  return cy.get('iframe').its('0.contentDocument.body').should('not.be.empty').then(cy.wrap);
});

/**
 * Search an app from dashboard and open app
 */
Cypress.Commands.add('searchAndOpenApp', (appId) => {
  var appName = appId.split('/')[1];
  cy.get(dashboard.searchApp).type(appName);
  cy.contains(dashboard.apps.name, appName).siblings(dashboard.apps.links).find(dashboard.apps.edit).click();
});
