/* eslint-disable cypress/no-unnecessary-waiting */
/// <reference types="cypress" />
/// <reference types="../../support" />

import { designer } from '../../pageobjects/designer';

context('Sync app and deploy', () => {
  before(() => {
    cy.visit('/');
    cy.studiologin(Cypress.env('autoTestUser'), Cypress.env('autoTestUserPwd'));
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

  it('is possible sync changes', () => {
    cy.searchAndOpenApp(Cypress.env('designerApp'));
    // Make some changes
    cy.findByRole('button', { name: 'Endre' }).click();
    cy.get(designer.aboutApp.appName).should('be.enabled').clear().type(Date.now());
    cy.get(designer.aboutApp.appDescription).click();
    // Sync app changes
    cy.get('#share_changes_button').click();
    cy.get(designer.syncApp.commitMessage).should('be.visible').clear().type('automation');
    cy.get(designer.syncApp.pushButton).should('be.visible').click();
    cy.wait('@commitAndPushChanges').its('response.statusCode').should('eq', 200);
    cy.wait('@pullChanges').its('response.statusCode').should('eq', 200);
    cy.get(designer.syncApp.pushSuccess).isVisible();
  });
});
