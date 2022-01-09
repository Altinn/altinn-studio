/// <reference types="cypress" />
/// <reference types="../../support" />

import { header } from '../../pageobjects/header';

context('Repository', () => {
  beforeEach(() => {
    cy.visit('/');
    cy.studiologin(Cypress.env('autoTestUser'), Cypress.env('autoTestUserPwd'));
    cy.searchAndOpenApp(Cypress.env('designerApp'));
  });

  it('is possible to open repository of an app', () => {
    cy.get(header.profileIconDesigner).click();
    cy.get(header.menu.openRepo)
      .invoke('attr', 'href')
      .then((href) => {
        cy.visit(href);
      });
    cy.get('.repo-header').should('be.visible');
    cy.get('a[href="/repos/"]').should('be.visible').click();
    cy.get('img[alt="Altinn logo"]').should('be.visible');
  });
});
