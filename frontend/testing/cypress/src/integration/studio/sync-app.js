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
    cy.intercept('POST', '**/commit').as('commitChanges');
    cy.intercept('GET', '**/pull').as('pullChanges');
    cy.intercept('POST', '**/push').as('pushChanges');
    cy.intercept('GET', '**/releases**').as('getAppBuilds');
    cy.intercept('POST', '**/releases**').as('startAppBuild');
    cy.intercept('GET', '**/Deployments**').as('getAppDeploys');
    cy.visit('/dashboard');
  });

  it('is possible sync changes', () => {
    cy.searchAndOpenApp(Cypress.env('designerApp'));
    // Sync app changes
    cy.findByRole('link', { name: designer.appMenu.editText }).click();
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
  });
});
