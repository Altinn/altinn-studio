/// <reference types="cypress" />
/// <reference types="../../support" />

import * as loginPage from '../../pageobjects/loginandreg';
import * as dashboard from '../../pageobjects/dashboard';

context('Login', () => {
  beforeEach(() => {
    cy.visit('/');
  });

  it('Login with valid user credentials', () => {
    cy.studiologin(Cypress.env('autoTestUser'), Cypress.env('autoTestUserPwd'));
    cy.get(dashboard.searchApp).should('be.visible');
  });

  it('Login with invalid user credentials', () => {
    cy.studiologin(Cypress.env('autoTestUser'), 'test123');
    cy.get(loginPage.errorMessage).should('be.visible');
  });
});
