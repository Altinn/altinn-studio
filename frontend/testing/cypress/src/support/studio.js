/// <reference types="cypress" />
import '@testing-library/cypress/add-commands';
import { login } from '../pageobjects/loginandreg';
import { dashboard } from '../pageobjects/dashboard';
import { designer } from '../pageobjects/designer';
import { header } from '../pageobjects/header';

import '@testing-library/cypress/add-commands';

/**
 * Login to studio with user name and password
 */
Cypress.Commands.add('studiologin', (userName, userPwd) => {
  cy.session([userName, userPwd], () => {
    cy.visit('/');
    cy.get(login.loginButton).should('be.visible').click();
    cy.get(login.userName).should('be.visible').type(userName);
    cy.get(login.userPwd).should('be.visible').type(userPwd, { log: false });
    cy.get(login.submit).should('be.visible').click();
  });
});

/**
 * Switch selected context in dashboard
 * @param context The context to switch to. Either 'self', 'all', or org user name.
 */
Cypress.Commands.add('switchSelectedContext', (context) => {
  cy.intercept('GET', '**/repos/search**').as('fetchApps');
  cy.get(header.profileIcon).should('be.visible').click();
  if (['self', 'all'].includes(context)) {
    cy.get(header.menu[context]).should('be.visible').click();
  } else {
    cy.get(header.menu.org(context)).should('be.visible').click();
  }
});

/**
 * create an app in studio with user logged in and in dashboard
 */
Cypress.Commands.add('createapp', (orgName, appName) => {
  cy.visit('/dashboard');
  cy.get(dashboard.newApp).should('be.visible').click();
  cy.get(dashboard.appOwners).should('be.visible').click();
  cy.contains(dashboard.appOwnersList, orgName).click();
  cy.get(dashboard.appName).should('be.visible').type(appName);
  cy.intercept('POST', '**/designer/api/repos/**').as('postCreateApp');
  cy.contains(dashboard.button, dashboard.createApp).should('be.visible').click();
  cy.wait('@postCreateApp', { timeout: 30000 }).its('response.statusCode').should('eq', 201);
});

/**
 * Delete all the added components in ux-editor
 */
Cypress.Commands.add('deletecomponents', () => {
  cy.get(designer.dragToArea)
    .find("[role='listitem']")
    .then(($elements) => {
      if ($elements.length > 0 && $elements.text().indexOf('Tomt, dra noe inn her...') === -1) {
        cy.get($elements).each(($element) => {
          cy.wrap($element).trigger('mouseover');
        });
        cy.get("[data-testid='component-delete-button']").click({ multiple: true, force: true });
      }
    });
});

/**
 * Delete local changes of an app for a logged in user
 */
Cypress.Commands.add('deleteLocalChanges', (appId) => {
  cy.getCookie('AltinnStudioDesigner').should('exist');
  cy.visit(`editor/${appId}#/`);
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
 * Search an app from dashboard and open app
 */
Cypress.Commands.add('searchAndOpenApp', (appId) => {
  const [_, appName] = appId.split('/');
  cy.visit('/dashboard');
  cy.get(dashboard.searchApp).type(appName);
  cy.contains(dashboard.apps.name, appName)
    .siblings(dashboard.apps.links)
    .find(dashboard.apps.edit)
    .click();
});

/**
 * Select an element in the application list
 */
Cypress.Commands.add('selectElementInApplicationList', (appListHeaderText, elementSelector) => {
  return cy.contains('h2', appListHeaderText).siblings().find(elementSelector);
});
