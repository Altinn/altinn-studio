/// <reference types="cypress" />
/// <reference types="../../support" />

import { dashboard } from '../../pageobjects/dashboard';
import { designer } from '../../pageobjects/designer';

context('WCAG', () => {
  beforeEach(() => {
    cy.visit('/');
    cy.intercept('GET', 'designer/api/repos/search?**').as('fetchApps');
    cy.studiologin(Cypress.env('autoTestUser'), Cypress.env('autoTestUserPwd'));
    cy.get(dashboard.searchApp).should('be.visible');
    cy.wait('@fetchApps')
      .its('response.statusCode')
      .should((statusCode) => {
        expect([200, 302]).to.contain(statusCode);
      });
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

    // Forms editor
    cy.findByRole('link', { name: designer.appMenu.editText }).click();
    cy.testWcag();

    // Text editor
    cy.findByRole('link', { name: designer.appMenu.textEditorText }).click();
    cy.findByText('Lukk').click();
    cy.testWcag();

    // Data model
    cy.findByRole('link', { name: designer.appMenu.datamoodelText }).click();
    cy.findByText('Lukk').click();
    cy.testWcag();

    // Deploy
    cy.findByRole('button', { name: designer.appMenu.deployText }).click();
    cy.testWcag();
  });
});
