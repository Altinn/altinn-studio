/// <reference types="cypress" />
/// <reference types="../../support" />

import { dashboard } from '../../selectors/dashboard';
import { header } from '../../selectors/header';

context('WCAG', () => {
  before(() => {
    cy.deleteallapps(Cypress.env('autoTestUser'), Cypress.env('accessToken'));
    cy.visit('/');
    cy.studiologin(Cypress.env('autoTestUser'), Cypress.env('autoTestUserPwd'));
    cy.createapp(Cypress.env('autoTestUser'), 'designer');
  });

  beforeEach(() => {
    cy.visit('/');
    cy.intercept('GET', 'designer/api/repos/search?**').as('fetchApps');
    dashboard.getSearchReposField().should('be.visible');
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
    dashboard.getNewAppLink().should('be.visible').click();
    cy.testWcag();
  });

  it('accessibility test for app designer', () => {
    cy.searchAndOpenApp(Cypress.env('designerApp'));
    cy.testWcag();

    // Forms editor
    header.getCreateLink().click();
    cy.testWcag();

    // Text editor
    header.getTextEditorLink().click();
    cy.testWcag();

    // Data model
    header.getDatamodelLink().click();
    cy.testWcag();

    // Deploy
    header.getDeployButton().click();
    cy.testWcag();
  });
});
