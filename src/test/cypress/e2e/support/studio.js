/// <reference types="cypress" />
import { login } from '../pageobjects/loginandreg';
import { dashboard } from '../pageobjects/dashboard';
import { designer } from '../pageobjects/designer';

/**
 * Login to studio with user name and password
 */
Cypress.Commands.add('studiologin', (userName, userPwd) => {
  cy.get(login.loginButton).click();
  cy.get(login.userName).type(userName);
  cy.get(login.userPwd).type(userPwd, { log: false });
  cy.get(login.submit).click();
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
  cy.visit(`designer/${Cypress.env('deployApp')}#/about`);
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
  cy.get(designer.deleteChanges.confirm).should('be.visible').click();
  cy.get(designer.deleteChanges.name).should('not.exist');
});

/**
 * Get body of an iframe document
 */
Cypress.Commands.add('getIframeBody', () => {
  return cy.get('iframe').its('0.contentDocument.body').should('not.be.empty').then(cy.wrap);
});
