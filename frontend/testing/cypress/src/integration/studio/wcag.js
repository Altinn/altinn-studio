/// <reference types="cypress" />
/// <reference types="../../support" />

import { dashboard } from "../../selectors/dashboard";
import { header } from "../../selectors/header";

context('WCAG', () => {
  before(() => {
    cy.studioLogin(Cypress.env('autoTestUser'), Cypress.env('autoTestUserPwd'));
    cy.createApp(Cypress.env('autoTestUser'), Cypress.env('designerAppName'));
  });

  beforeEach(() => {
    cy.visit('/');
    cy.intercept('GET', '**/repos/search**').as('fetchApps');
    dashboard.getSearchReposField().should('be.visible');
    cy.wait('@fetchApps')
      .its('response.statusCode')
      .should((statusCode) => {
        expect([200, 302]).to.contain(statusCode);
      });
  });

    after(() => {
        cy.deleteAllApps(Cypress.env('autoTestUser'), Cypress.env('accessToken'));
    });

  it('accessibility test for dashboard', () => {
    cy.testWcag();
  });

  it('accessibility test for new app', () => {
    dashboard.getNewAppLink().should('be.visible').click();
    cy.testWcag();
  });

  it('accessibility test for app designer', () => {
    cy.searchAndOpenApp(Cypress.env('designerAppName'));
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
