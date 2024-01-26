/// <reference types="cypress" />
/// <reference types="../../support" />

import { header } from '../../selectors/header';
import { settings } from '../../selectors/settings';

context('Sync app and deploy', () => {
  before(() => {
    cy.deleteAllApps(Cypress.env('autoTestUser'), Cypress.env('accessToken'));
    cy.studioLogin(Cypress.env('autoTestUser'), Cypress.env('autoTestUserPwd'));
    cy.createApp(Cypress.env('autoTestUser'), Cypress.env('designerAppName'));
  });

  beforeEach(() => {
    cy.intercept('GET', '**/status').as('getRepoStatus');
    cy.intercept('POST', '**/commit-and-push').as('commitAndPushChanges');
    cy.intercept('GET', '**/pull').as('pullChanges');
    cy.intercept('POST', '**/push').as('pushChanges');
    cy.intercept('GET', '**/releases**').as('getAppBuilds');
    cy.intercept('POST', '**/releases**').as('startAppBuild');
    cy.intercept('GET', '**/Deployments**').as('getAppDeploys');
    cy.intercept('POST', '**/form-layout/**').as('postLayout');
    cy.visit('/dashboard');
  });

  after(() => {
    cy.deleteAllApps(Cypress.env('autoTestUser'), Cypress.env('accessToken'));
  });

  it('is possible to sync changes', () => {
    cy.searchAndOpenApp(Cypress.env('designerAppName'));
    // Make some changes
    header.getSettingsButton().click();
    settings.getAppNameField().should('be.enabled').clear().type(Date.now());
    settings.getCloseButton().click();
    // Sync app changes
    header.getShareChangesButton().click();
    header.getDescribeChangesField().should('be.visible').clear().type('automation');
    header.getValidateChangesButton().should('be.visible').click();
    cy.wait('@commitAndPushChanges').its('response.statusCode').should('eq', 200);
    cy.wait('@pullChanges').its('response.statusCode').should('eq', 200);
    header.getSharedChangesSuccessMessage().isVisible();
  });
});
