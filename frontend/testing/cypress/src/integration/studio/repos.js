/// <reference types="cypress" />
/// <reference types="../../support" />

import { gitea } from "../../selectors/gitea";
import { header } from '../../selectors/header';

context('Repository', () => {
  before(() => {
    cy.deleteallapps(Cypress.env('autoTestUser'), Cypress.env('accessToken'));
    cy.visit('/');
    cy.studiologin(Cypress.env('autoTestUser'), Cypress.env('autoTestUserPwd'));
    cy.createapp(Cypress.env('autoTestUser'), 'designer');
  });

  beforeEach(() => {
    cy.visit('/');
    cy.studiologin(Cypress.env('autoTestUser'), Cypress.env('autoTestUserPwd'));
    cy.searchAndOpenApp(Cypress.env('designerApp'));
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
