/// <reference types="cypress" />
/// <reference types="../../support" />

import { dashboard } from '../../pageobjects/dashboard';
import { designer } from '../../pageobjects/designer';
import { gitea } from '../../pageobjects/gitea';
import * as texts from '../../fixtures/texts.json';

context('New App', () => {
  beforeEach(() => {
    cy.deleteallapps(Cypress.env('autoTestUser'), Cypress.env('accessToken'));
    cy.visit('/');
    cy.studiologin(Cypress.env('autoTestUser'), Cypress.env('autoTestUserPwd'));
    cy.get(dashboard.searchApp).should('be.visible');
  });

  it('is possible to start app creation and exits', () => {
    cy.visit('/dashboard');
    cy.get(dashboard.newApp).should('be.visible').click();
    cy.get(dashboard.appOwners).should('be.visible').click();
    cy.contains(dashboard.appOwnersList, Cypress.env('autoTestUser')).click();
    cy.get(dashboard.appName).should('be.visible').type('dashboard');
    cy.contains(dashboard.button, 'Avbryt').should('be.visible').click();
    cy.get(dashboard.searchApp).should('be.visible');
  });

  it('shows error on app creation with existing name', () => {
    cy.get(dashboard.newApp).should('be.visible').click();
    cy.get(dashboard.appOwners).should('be.visible').click();
    const appName = Cypress.env('deployApp').split('/')[1];
    cy.contains(dashboard.appOwnersList, 'Testdepartementet').click();
    cy.get(dashboard.appName).should('be.visible').type(appName);
    cy.intercept('POST', '**/designer/api/repos/create-app?**').as('postCreateApp');
    cy.contains(dashboard.button, dashboard.createApp).should('be.visible').click();
    cy.wait('@postCreateApp').its('response.statusCode').should('eq', 409);
    cy.contains('div', texts.appExists).should('be.visible');
  });

  it('is possible to create an app and delete it', () => {
    cy.createapp(Cypress.env('autoTestUser'), 'new-app');
    cy.contains(designer.aboutApp.appHeader, 'Om appen').should('be.visible');
    cy.visit(`/repos/${Cypress.env('autoTestUser')}/new-app/settings`);
    cy.get(gitea.deleteRepo).should('be.visible').click();
    cy.get(gitea.deleteRepoModal).find(gitea.repoName).should('be.visible').type('new-app');
    cy.get(gitea.deleteRepoModal).find('button').should('be.visible').click();
    cy.get(gitea.success).should('be.visible');
  });
  after(() => {
    cy.deleteallapps(Cypress.env('autoTestUser'), Cypress.env('accessToken'));
  });
});
