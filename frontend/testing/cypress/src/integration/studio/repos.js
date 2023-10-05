/// <reference types="cypress" />
/// <reference types="../../support" />

import { gitea } from "../../selectors/gitea";
import { header } from '../../selectors/header';

context('Repository', () => {
  before(() => {
    cy.studioLogin(Cypress.env('autoTestUser'), Cypress.env('autoTestUserPwd'));
    cy.createApp(Cypress.env('autoTestUser'), Cypress.env('designerAppName'));
  });

  beforeEach(() => {
    cy.visit('/');
    cy.searchAndOpenApp(Cypress.env('designerAppName'));
  });

  after(() => {
    cy.deleteAllApps(Cypress.env('autoTestUser'), Cypress.env('accessToken'));
  });

  it('is possible to open repository of an app from app development page', () => {
    header.getProfileIcon().click();
    header
      .getOpenRepoLink()
      .invoke('attr', 'href')
      .then((href) => {
        cy.visit(href);
      });
    gitea.getRepositoryHeader().should('be.visible');
    gitea.getAltinnLogo().should('be.visible');
  });
});
