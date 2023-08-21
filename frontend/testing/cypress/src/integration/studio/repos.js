/// <reference types="cypress" />
/// <reference types="../../support" />

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
    cy.get('.repo-header').should('be.visible');
    cy.get('a[href="/repos/"]').should('be.visible').click();
    cy.get('img[alt="Altinn logo"]').should('be.visible');
  });
});
