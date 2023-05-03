/* eslint-disable cypress/no-unnecessary-waiting */
/// <reference types="cypress" />
/// <reference types="../../support" />

import { designer } from '../../pageobjects/designer';

context('Sync app and deploy', () => {
  beforeEach(() => {
    cy.intercept('GET', '**/status').as('getRepoStatus');
    cy.intercept('POST', '**/commit').as('commitChanges');
    cy.intercept('GET', '**/pull').as('pullChanges');
    cy.intercept('POST', '**/push').as('pushChanges');
    cy.intercept('GET', '**/releases**').as('getAppBuilds');
    cy.intercept('POST', '**/releases**').as('startAppBuild');
    cy.intercept('GET', '**/Deployments**').as('getAppDeploys');
  });

  it('is possible sync changes, build and deploy app', () => {
    cy.visit('/');
    cy.studiologin(Cypress.env('autoTestUser'), Cypress.env('autoTestUserPwd'));
    cy.searchAndOpenApp(Cypress.env('deployApp'));

    // Sync app changes
    cy.get(designer.appMenu.edit).click();
    cy.get(designer.formComponents.shortAnswer).parents(designer.draggable).trigger('dragstart');
    cy.get(designer.dragToArea).trigger('drop');
    cy.get('#share_changes_button').click();
    cy.get(designer.syncApp.commitMessage).should('be.visible').clear().type('automation');
    cy.get(designer.syncApp.pushButton).should('be.visible').click();
    cy.wait('@commitChanges').its('response.statusCode').should('eq', 200);
    cy.wait('@pullChanges').its('response.statusCode').should('eq', 200);
    cy.get(designer.syncApp.pushButton).should('be.visible').click();
    cy.wait('@pushChanges').its('response.statusCode').should('eq', 200);
    cy.get(designer.syncApp.pushSuccess).isVisible();
    cy.reload();

    // Start app build
    cy.get(designer.appMenu.deploy).click();
  });
});
