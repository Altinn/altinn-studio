/// <reference types="cypress" />
import '@testing-library/cypress/add-commands';
import * as texts from '../../../../language/src/nb.json';
import { dashboard } from '../selectors/dashboard';
import { designer } from '../selectors/designer';
import { header } from '../selectors/header';
import { login } from '../selectors/login';
import { gitea } from '../selectors/gitea';
import { DEFAULT_SELECTED_LAYOUT_NAME } from '../../../../packages/shared/src/constants';

/**
 * Login to studio with user name and password
 */
Cypress.Commands.add('studiologin', (userName, userPwd) => {
  cy.session([userName, userPwd], () => {
    cy.visit('/');
    login.getLoginButton().should('be.visible').click();
    gitea.getLanguageMenu().should('be.visible').click();
    gitea.getLanguageMenuItem('Norsk').should('be.visible').click();
    gitea.getUsernameField().should('be.visible').type(userName);
    gitea.getPasswordField().should('be.visible').type(userPwd, { log: false });
    gitea.getLoginButton().should('be.visible').click();
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
  designer
    .getDroppableList()
    .findAllByRole('listitem')
    .then(($elements) => {
      if ($elements.length > 0 && $elements.text().indexOf(texts['ux_editor.container_empty']) === -1) {
        cy.get($elements).each(($element) => {
          cy.wrap($element).trigger('mouseover');
          cy.wrap($element).findByTitle(texts['general.delete']).click({ force: true });
          cy.wrap($element)
            .findByRole('button', { name: texts['ux_editor.component_deletion_confirm'] })
            .click();
        });
      }
    });
});

/**
 * Search an app from dashboard and open app
 */
Cypress.Commands.add('searchAndOpenApp', (appId) => {
  const [_, appName] = appId.split('/');
  cy.visit('/dashboard');
  dashboard.getSearchReposField().type(appName);
  dashboard
    .getLinksCellForSearchResultApp(appName)
    .findByRole('menuitem', { name: texts['dashboard.edit_app'] })
    .click();
});

/**
 * Select an element in the application list
 */
Cypress.Commands.add('selectElementInApplicationList', (appListHeaderText, elementSelector) => {
  return cy.contains('h2', appListHeaderText).siblings().find(elementSelector);
});

Cypress.Commands.add('ensureCreatePageIsLoaded', () => {
  cy.intercept('GET', '**/app-development/form-layouts?**').as('formLayouts');
  cy.intercept('GET', '**/app-development/layout-settings?**').as('getLayoutSettings');
  cy.wait('@formLayouts').its('response.statusCode').should('eq', 200);
  cy.wait('@getLayoutSettings').its('response.statusCode').should('eq', 200);
  cy.findByRole('heading', { name: DEFAULT_SELECTED_LAYOUT_NAME }).should('be.visible');
  cy.findByRole('heading', { name: `${texts['general.page']}1` }).should('be.visible');
});
