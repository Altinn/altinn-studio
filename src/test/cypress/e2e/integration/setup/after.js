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
    cy.deleteallapps(Cypress.env('appOwner'), Cypress.env('accessToken'));
  });

  it('Delete Org', () => {
    cy.deleteorg(Cypress.env('appOwner'), Cypress.env('accessToken'));
  });

  it('Delete an user', () => {
    cy.deleteuser(Cypress.env('userName'), Cypress.env('accessToken'));
  });
});
