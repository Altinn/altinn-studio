/// <reference types="cypress" />
/// <reference types="../../support" />

import { dashboard } from '../../pageobjects/dashboard';
import { header } from '../../pageobjects/header';
import { common } from '../../pageobjects/common';

context('Dashboard', () => {
  before(() => {
    cy.deleteallapps(Cypress.env('autoTestUser'), Cypress.env('accessToken'));
    cy.visit('/');
    cy.studiologin(Cypress.env('autoTestUser'), Cypress.env('autoTestUserPwd'));
    cy.createapp(Cypress.env('autoTestUser'), 'auto-app');
    cy.createapp(Cypress.env('autoTestUser'), 'test-app');
  });

  beforeEach(() => {
    cy.visit('/dashboard');
    cy.switchSelectedContext('self');
    cy.intercept('GET', '**/repos/search**').as('fetchApps');
    cy.get(dashboard.searchApp).should('be.visible');
    cy.wait('@fetchApps').its('response.statusCode').should('eq', 200);
  });

  it('is possible to view apps, add and remove favourites', () => {
    const createdBy = Cypress.env('autoTestUser');
    cy.intercept('PUT', '**/designer/api/user/starred/**').as('addFavourite');
    cy.selectElementInApplicationList('Mine applikasjoner', common.gridRow).then((apps) => {
      cy.get(apps).should('have.length.gte', 1);
      cy.get(apps).find(dashboard.apps.favourite).click({ multiple: true });
      cy.wait('@addFavourite').its('response.statusCode').should('eq', 204);
      cy.get(apps)
        .first()
        .then((app) => {
          cy.get(app).children(dashboard.apps.name).invoke('text').should('not.be.empty');
          cy.get(app).children(dashboard.apps.createdBy).should('have.text', createdBy);
          cy.get(app).children(dashboard.apps.updatedAt).invoke('text').should('not.be.empty');
        });
    });
    cy.intercept('DELETE', '**/designer/api/user/starred/**').as('removeFavourite');
    cy.contains('h2', 'Favoritter')
      .siblings()
      .find(common.gridRow)
      .then((favourites) => {
        cy.get(favourites).should('have.length.gte', 1);
        cy.get(favourites).first().find(dashboard.apps.favourite).click();
        cy.wait('@removeFavourite').its('response.statusCode').should('eq', 204);
      });
  });

  it('is possible to change context and view all apps', () => {
    cy.visit('/dashboard');
    cy.get(header.profileIcon).should('be.visible').click();
    cy.get(header.menu.all).should('be.visible').click();
    cy.wait('@fetchApps');
    cy.contains('h2', 'Alle applikasjoner').should('be.visible');
  });

  it('is possible to change context and view only Testdepartementet apps', () => {
    cy.visit('/dashboard');
    cy.get(header.profileIcon).should('be.visible').click();
    cy.get(header.menu.org(Cypress.env('appOwnerUsername')))
      .should('be.visible')
      .click();
    cy.wait('@fetchApps');
    cy.contains('h2', `${Cypress.env('appOwner')} Applikasjoner`).should('be.visible');
  });

  it('is possible to search an app by name', () => {
    cy.get(dashboard.searchApp).type('auto');
    cy.wait('@fetchApps');
    cy.contains('h2', 'Søkeresultat')
      .siblings()
      .then((searchResult) => {
        cy.get(searchResult).find(common.gridRow).should('have.length.gte', 1);
        cy.get(searchResult)
          .find(common.gridRow)
          .first()
          .find(dashboard.apps.name)
          .should('contain.text', 'auto');
      });
  });

  it('is possible to sort apps by last changed date', () => {
    cy.visit('/dashboard');
    // First click will put oldest application first
    cy.selectElementInApplicationList('Mine applikasjoner', common.columnHeader)
      .contains('Sist endret')
      .click();
    cy.wait('@fetchApps');
    cy.selectElementInApplicationList('Mine applikasjoner', common.gridRow).then((apps) => {
      cy.get(apps).should('have.length.gte', 1);
      cy.get(apps)
        .first()
        .then((app) => {
          cy.get(app).children(dashboard.apps.name).invoke('text').should('eq', 'auto-app');
        });
    });

    // Second click will put newest application first
    cy.selectElementInApplicationList('Mine applikasjoner', common.columnHeader)
      .contains('Sist endret')
      .click();
    cy.wait('@fetchApps');
    cy.selectElementInApplicationList('Mine applikasjoner', common.gridRow).then((apps) => {
      cy.get(apps).should('have.length.gte', 1);
      cy.get(apps)
        .first()
        .then((app) => {
          cy.get(app).children(dashboard.apps.name).invoke('text').should('eq', 'test-app');
        });
    });
  });

  it('is not possible to find an app that does not exist', () => {
    cy.get(dashboard.searchApp).type('cannotfindapp');
    cy.wait('@fetchApps');
    cy.contains('h2', 'Søkeresultat')
      .siblings()
      .then((searchResult) => {
        cy.get(searchResult).find(common.gridRow).should('have.length', 0);
        cy.get(searchResult).find('p').should('contain.text', 'Ingen applikasjoner funnet');
      });
  });

  it('is possible to open repository of an app from dashboard', () => {
    cy.contains(dashboard.apps.name, 'auto-app')
      .siblings(dashboard.apps.links)
      .find(dashboard.apps.repo)
      .click();
    cy.get('.repo-header').should('be.visible');
    cy.get('.repo-header').should('contain.text', Cypress.env('autoTestUser'));
    cy.get('.repo-header').should('contain.text', 'auto-app');
    cy.get('img[alt="Altinn logo"]').should('be.visible');
  });

  after(() => {
    cy.deleteallapps(Cypress.env('autoTestUser'), Cypress.env('accessToken'));
  });
});
