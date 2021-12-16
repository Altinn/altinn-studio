/// <reference types="cypress" />
/// <reference types="../../support" />

import { dashboard } from '../../pageobjects/dashboard';
import { header } from '../../pageobjects/header';
import Common from '../../pageobjects/common';
import { repos } from '../../fixtures/repo';

const common = new Common();

context('Dashboard', () => {
  beforeEach(() => {
    cy.visit('/');
    cy.studiologin(Cypress.env('autoTestUser'), Cypress.env('autoTestUserPwd'));
    cy.get(dashboard.searchApp).should('be.visible');
  });

  it('is possible to start app creation and exits', () => {
    cy.get(dashboard.newApp).should('be.visible');
    cy.get(dashboard.newApp).click();
    cy.get(dashboard.appOwners).click();
    cy.contains(dashboard.appOwnersList, Cypress.env('appOwner')).click();
    cy.get(dashboard.appName).type('dashboard');
    cy.get(dashboard.closeButton).click({ force: true });
  });

  it('is possible to view apps, add and remove favorites', () => {
    if (Cypress.env('environment') == 'local') cy.intercept('GET', '**/user/repos', repos(10));
    cy.contains('h2', 'Mine applikasjoner')
      .siblings()
      .find(common.gridRow)
      .then((apps) => {
        cy.get(apps).should('have.length.gte', 1);
        cy.get(apps)
          .first()
          .then((app) => {
            cy.get(app).find(dashboard.apps.favorite).click();
            cy.get(app).children(dashboard.apps.name).invoke('text').should('not.be.empty');
            cy.get(app).children(dashboard.apps.createdBy).should('have.text', Cypress.env('autoTestUser'));
            cy.get(app).children(dashboard.apps.updatedAt).invoke('text').should('not.be.empty');
          });
      });
    cy.contains('h2', 'Favoritter')
      .siblings()
      .find(common.gridRow)
      .then((favorites) => {
        cy.get(favorites).should('have.length.gte', 1);
        cy.get(favorites).first().find(dashboard.apps.favorite).click();
      });
  });

  it('is possible to change context and view all apps', () => {
    if (Cypress.env('environment') == 'local') cy.intercept('GET', '**/user/repos', repos(10));
    cy.intercept('**/repos/search**').as('getAllRepos');
    cy.get(header.profileIcon).should('be.visible').click();
    cy.get(header.menu.all).should('be.visible').click();
    cy.wait('@getAllRepos');
    cy.contains('h2', 'Alle applikasjoner').should('be.visible');
  });

  it('is possible to search an app by name', () => {
    if (Cypress.env('environment') == 'local') cy.intercept('GET', '**/user/repos', repos(10));
    cy.intercept('**/repos/search**').as('searchRepos');
    cy.get(dashboard.searchApp).type('auto');
    cy.wait('@searchRepos');
    cy.contains('h2', 'Søkeresultat')
      .siblings()
      .then((searchResult) => {
        cy.get(searchResult).find(common.gridRow).should('have.length.gte', 1);
        cy.get(searchResult).find(common.gridRow).first().find(dashboard.apps.name).should('contain.text', 'auto');
      });
  });
});
