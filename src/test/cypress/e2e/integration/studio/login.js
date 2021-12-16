/// <reference types="cypress" />
/// <reference types="../../support" />

import { login } from '../../pageobjects/loginandreg';
import { dashboard } from '../../pageobjects/dashboard';

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
    cy.get(login.errorMessage).should('be.visible');
  });
});
