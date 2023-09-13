/// <reference types="cypress" />
/// <reference types="../../support" />

import * as texts from '@altinn-studio/language/src/nb.json';

// Cypress tests of sub-repo Resourceadm: this is a work in progress

context('Resourceadm', () => {
  before(() => {
    cy.studiologin(Cypress.env('autoTestUser'), Cypress.env('autoTestUserPwd'));
  });

  beforeEach(() => {
    cy.visit('/resourceadm/ttd/ttd-resources/');
  });

  it('is possible to visit Resourceadm main page', () => {
    cy.url().should('include', '/ttd/ttd-resources');
  });

  it('is possible to switch to all, and go to Dashboard via Error page', () => {
    cy.switchSelectedContext('all');
    cy.url().should('include', '/resourceadm/all');
    cy.findByRole('link', {
      name: texts['resourceadm.error_back_to_dashboard'],
    }).click();
    cy.url().should('include', '/dashboard');
  });

  it('is possible to switch to self, and go to Dashboard via Error page', () => {
    cy.switchSelectedContext('self');
    cy.findByRole('link', {
      name: texts['resourceadm.error_back_to_dashboard'],
    }).click();
    cy.url().should('include', '/dashboard');
  });

  it('is possible to switch to all, and return via Redirect page', () => {
    cy.switchSelectedContext('all');
    cy.url().should('include', '/resourceadm/all');
    cy.visit('/resourceadm/ttd/');
    cy.url().should('include', '/ttd/ttd-resources');
  });
});
