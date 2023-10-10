/// <reference types="cypress" />
/// <reference types="../../support" />

import * as texts from '../../../../../language/src/nb.json';
import { administration } from "../../selectors/administration";
import { dashboard } from "../../selectors/dashboard";
import { gitea } from "../../selectors/gitea";

context('New App', () => {
  before(() => {
    cy.studioLogin(Cypress.env('autoTestUser'), Cypress.env('autoTestUserPwd'));
  });
  beforeEach(() => {
    cy.visit('/dashboard');
    cy.switchSelectedContext('self');
    dashboard.getSearchReposField().should('be.visible');
  });
  after(() => {
    cy.deleteAllApps(Cypress.env('autoTestUser'), Cypress.env('accessToken'));
  });

  it('is possible to start app creation and exit', () => {
    dashboard.getNewAppLink().should('be.visible').click();
    dashboard.getAppOwnerField().should('be.visible').click();
    dashboard.getOrgOption(Cypress.env('autoTestUser')).click();
    dashboard.getSavedNameField().should('be.visible').type('dashboard');
    dashboard.getCancelButton().should('be.visible').click();
    dashboard.getSearchReposField().should('be.visible');
  });

  it('shows error on app creation with existing name', () => {
    // Create an app
    const appName = 'my-existing-app';
    cy.createApp(Cypress.env('autoTestUser'), appName);
    administration.getHeader().should('be.visible');

    // Return to dashboard
    cy.visit(`/dashboard`);

    // Try to create app with the same name
    dashboard.getNewAppLink().should('be.visible').click();
    dashboard.getAppOwnerField().should('be.visible').click();
    dashboard.getOrgOption(Cypress.env('autoTestUser')).click();
    dashboard.getSavedNameField().should('be.visible').type(appName);
    cy.intercept('POST', '**/designer/api/repos/create-app?**').as('postCreateApp');
    dashboard.getCreateAppButton().should('be.visible').click();
    cy.wait('@postCreateApp').its('response.statusCode').should('eq', 409);
    cy.findByText(texts['dashboard.app_already_exists']).should('be.visible');
  });

  it('shows error on app creation with invalid name', () => {
    // Create an app
    const appName = '123-app';
    // Try to create app with invalid name
    dashboard.getNewAppLink().should('be.visible').click();
    dashboard.getAppOwnerField().should('be.visible').click();
    dashboard.getOrgOption(Cypress.env('autoTestUser')).click();
    dashboard.getSavedNameField().should('be.visible').type(appName);
    dashboard.getCreateAppButton().should('be.visible').click();
    cy.findByText(texts['dashboard.service_name_has_illegal_characters']).should('be.visible');
  });

  it('is possible to create an app and delete it', () => {
    const appName = 'new-app';
    cy.createApp(Cypress.env('autoTestUser'), appName);
    administration.getHeader().should('be.visible');
    cy.visit(`/repos/${Cypress.env('autoTestUser')}/${appName}/settings`);
    gitea.getDeleteButton().should('be.visible').click();
    gitea.getDeleteRepositoryNameField().should('be.visible').type(appName);
  });
});
