/// <reference types="cypress" />
/// <reference path="../../support/index.d.ts" />

import { login, registration } from '../../pageobjects/loginandreg';

/**
 * Setup test script that is run before all the tests
 *    Delete the org
 *    Create an org
 *    Create user in studio
 *    Make the user as owner of the org
 * command: yarn run before:all
 */
context('Before all tests', () => {
  before(() => {
    cy.deleteorg(Cypress.env('appOwner'), Cypress.env('accessToken'));
  });

  it('Create org ttd', () => {
    cy.createorg(Cypress.env('appOwner'), Cypress.env('accessToken'));
  });

  it('Create User', () => {
    cy.visit('/');
    cy.get(login.loginButton).click();
    cy.get(registration.singUp).click();
    cy.get(login.userName).type(Cypress.env('userName'));
    cy.get(registration.email).type(Cypress.env('testEmail'));
    cy.get(login.userPwd).type(Cypress.env('userPwd'));
    cy.get(registration.reTypePwd).type(Cypress.env('userPwd'));
    cy.get(login.submit).click();
  });

  it('Make an user owner of an org', () => {
    cy.makeuserowner(Cypress.env('appOwner'), Cypress.env('userName'), Cypress.env('accessToken'));
  });
});
