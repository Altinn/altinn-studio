/// <reference types="cypress" />
/// <reference types="../../support" />

import { dashboard } from '../../pageobjects/dashboard';
import { designer } from '../../pageobjects/designer';

context('WCAG', () => {
  beforeEach(() => {
    cy.visit('/');
    cy.intercept('GET', '**/repos/search**').as('fetchApps');
    cy.studiologin(Cypress.env('autoTestUser'), Cypress.env('autoTestUserPwd'));
    cy.get(dashboard.searchApp).should('be.visible');
    cy.wait('@fetchApps').its('response.statusCode').should('eq', 200);
  });

  it('accessibility test for dashboard', () => {
    cy.testWcag();
  });

  it('accessibility test for new app', () => {
    cy.get(dashboard.newApp).should('be.visible').click();
    cy.testWcag();
  });

  it('accessibility test for app designer', () => {
    cy.searchAndOpenApp(Cypress.env('designerApp'));
    cy.testWcag();
    cy.get(designer.appMenu.edit).click();
    cy.testWcag();
    cy.get(designer.appMenu.texts).click();
    cy.testWcag();
    cy.get(designer.appMenu.deploy).click();
    cy.testWcag();
  });
});
