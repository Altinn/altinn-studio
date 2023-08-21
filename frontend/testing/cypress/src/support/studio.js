/// <reference types="cypress" />
import '@testing-library/cypress/add-commands';
import { login } from '../selectors/login';
import { dashboard as dashboard2 } from '../pageobjects/dashboard';
import { designer } from '../pageobjects/designer';
import { dashboard } from '../selectors/dashboard';
import { header } from '../selectors/header';

import '@testing-library/cypress/add-commands';

/**
 * Login to studio with user name and password
 */
Cypress.Commands.add('studiologin', (userName, userPwd) => {
  cy.session([userName, userPwd], () => {
    cy.visit('/');
    login.getLoginButton().should('be.visible').click();
    login.getUsernameField().should('be.visible').type(userName);
    login.getPasswordField().should('be.visible').type(userPwd, { log: false });
    login.getLoginButton().should('be.visible').click();
  });
});

/**
 * Switch selected context in dashboard
 * @param context The context to switch to. Either 'self', 'all', or org user name.
 */
Cypress.Commands.add('switchSelectedContext', (context) => {
  cy.intercept('GET', '**/repos/search**').as('fetchApps');
  header.getAvatar().should('be.visible').click();
  switch (context) {
    case 'self':
      header.getMenuItemUser().should('be.visible').click();
      break;
    case 'all':
      header.getMenuItemAll().should('be.visible').click();
      break;
    default:
      header.getMenuItemOrg(context).should('be.visible').click();
  }
});

/**
 * create an app in studio with user logged in and in dashboard
 */
Cypress.Commands.add('createapp', (orgName, appName) => {
  cy.visit('/dashboard');
  dashboard.getNewAppLink().should('be.visible').click();
  dashboard.getAppOwnerField().should('be.visible').click();
  dashboard.getOrgOption(orgName).click();
  dashboard.getSavedNameField().should('be.visible').type(appName);
  cy.intercept('POST', '**/designer/api/repos/**').as('postCreateApp');
  dashboard.getCreateAppButton().should('be.visible').click();
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
 * Delete all the added components with specified test in ux-editor
 */
Cypress.Commands.add('deletecomponentsWithText', (text) => {
  cy.get(designer.dragToArea)
    .find("[role='listitem']")
    .then(($elements) => {
      if ($elements.length > 0 && $elements.text().indexOf('Tomt, dra noe inn her...') === -1) {
        cy.get($elements).each(($element) => {
          if ($element.get(text)) {
            cy.wrap($element).trigger('mouseover');
          }
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
  dashboard.getSearchReposField().type(appName);
  cy.contains(dashboard2.apps.name, appName)
    .siblings(dashboard2.apps.links)
    .find(dashboard2.apps.edit)
    .click();
});

/**
 * Select an element in the application list
 */
Cypress.Commands.add('selectElementInApplicationList', (appListHeaderText, elementSelector) => {
  return cy.contains('h2', appListHeaderText).siblings().find(elementSelector);
});
