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
 * Clear cookies and login to studio with user name and password
 */
Cypress.Commands.add('studioLogin', (userName, userPwd) => {
  cy.clearCookies();
  Cypress.session.clearAllSavedSessions();
  cy.session([userName, userPwd], () => {
    cy.visit('/');
    login.getLoginButton().should('be.visible').click();
    gitea.getLanguageMenu().should('be.visible').click();
    gitea.getLanguageMenuItem('Norsk').should('be.visible').click();
    gitea.getUsernameField().should('be.visible').type(userName);
    gitea.getPasswordField().should('be.visible').type(userPwd, { log: false });
    gitea.getLoginButton().should('be.visible').click();
    cy.url().should('contain', '/dashboard');
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
Cypress.Commands.add('createApp', (orgName, appName) => {
  cy.visit('/dashboard');
  dashboard.getNewAppLink().should('be.visible').click();
  dashboard.getAppOwnerField().should('be.visible').select(orgName);
  dashboard.getSavedNameField().should('be.visible').type(appName);
  cy.intercept('POST', '**/designer/api/repos/**').as('postCreateApp');
  dashboard.getCreateAppButton().should('be.visible').click();
  cy.wait('@postCreateApp', { timeout: 30000 }).its('response.statusCode').should('eq', 201);
});

/**
 * Delete all the added components in ux-editor
 */
Cypress.Commands.add('deleteComponents', () => {
  designer
    .getDroppableList()
    .findAllByRole('listitem')
    .then(($elements) => {
      if (
        $elements.length > 0 &&
        $elements.text().indexOf(texts['ux_editor.container_empty']) === -1
      ) {
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
Cypress.Commands.add('searchAndOpenApp', (appName) => {
  cy.visit('/dashboard');
  dashboard.getSearchReposField().type(appName);
  dashboard
    .getLinksCellForSearchResultApp(appName)
    .findByRole('menuitem', { name: texts[('dashboard.edit_app', { appName })] })
    .click();
});

Cypress.Commands.add('goToApp', (userName, appName) => {
  cy.visit(`/editor/${userName}/${appName}`);
});

/**
 * Select an element in the application list
 */
Cypress.Commands.add('selectElementInApplicationList', (appListHeaderText, elementSelector) => {
  return cy.contains('h2', appListHeaderText).siblings().find(elementSelector);
});

Cypress.Commands.add('ensureCreatePageIsLoaded', () => {
  cy.findByRole('button', { name: `${texts['ux_editor.pages_add']}` }).should('be.visible');
});

Cypress.Commands.add('openSettingsModal', () => {
  cy.findByRole('button', { name: texts['settings_modal.heading'] }).click();
});
