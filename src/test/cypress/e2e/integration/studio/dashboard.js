/// <reference types="cypress" />
/// <reference types="../../support" />

import * as dashboard from '../../pageobjects/dashboard';
import Common from '../../pageobjects/common';
import { repos } from '../../fixtures/repo';

const common = new Common();

context('Dashboard', () => {
  beforeEach(() => {
    cy.visit('/');
  });

  it('Create an app and exit creation', () => {
    cy.studiologin(Cypress.env('autoTestUser'), Cypress.env('autoTestUserPwd'));
    cy.get(dashboard.newApp).should('be.visible');
    cy.get(dashboard.newApp).click();
    cy.get(dashboard.appOwners).click();
    cy.contains(dashboard.appOwnersList, Cypress.env('appOwner')).click();
    cy.get(dashboard.appName).type('dashboard');
    cy.get(dashboard.closeButton).click();
  });

  it('Login and dashboard lists app', () => {
    if(Cypress.env('environment') == 'local')
      cy.intercept('GET', '**/designerapi/Repository/UserRepos', repos(10));
    cy.studiologin(Cypress.env('autoTestUser'), Cypress.env('autoTestUserPwd'));
    cy.get('h2').parent('div').siblings(common.gridContainer).children(common.gridItem).should('have.length.greaterThan', 1);
  });
});
