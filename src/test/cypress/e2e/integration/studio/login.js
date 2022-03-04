/// <reference types="cypress" />
/// <reference types="../../support" />

import { login } from '../../pageobjects/loginandreg';
import { header } from '../../pageobjects/header';
import { dashboard } from '../../pageobjects/dashboard';
import * as texts from '../../fixtures/texts.json';

context('Login', () => {
  beforeEach(() => {
    cy.visit('/');
  });

  it('is possible to login with valid user credentials and logout', () => {
    cy.studiologin(Cypress.env('autoTestUser'), Cypress.env('autoTestUserPwd'));
    cy.get(dashboard.searchApp).should('be.visible');
    cy.get(header.profileIcon).should('be.visible').click();
    cy.get(header.menu.logOut).should('be.visible').click();
    cy.contains(login.container, texts.welcome).should('be.visible');
  });

  it('is not possible to login with invalid user credentials', () => {
    cy.studiologin(Cypress.env('autoTestUser'), 'test123');
    cy.get(login.errorMessage).should('be.visible');
  });
});
