/// <reference types="cypress" />

/**
 * Setup test script that is run after all the tests
 *    Delete all the apps of an org
 *    Delete the org
 *    Delete the user
 * command: yarn run after:all
 */
context('After all tests', () => {
  it('Delete all apps', () => {
    cy.deleteallapps('org', Cypress.env('appOwner'), Cypress.env('accessToken'));
    cy.deleteallapps('user', Cypress.env('adminUser'), Cypress.env('accessToken'));
  });

  it('Delete Org', () => {
    cy.deleteorg(Cypress.env('appOwner'), Cypress.env('accessToken'));
  });

  it('Delete an user', () => {
    cy.deleteuser(Cypress.env('autoTestUser'), Cypress.env('accessToken'));
  });
});
