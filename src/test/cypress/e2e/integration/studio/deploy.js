/// <reference types="cypress" />
/// <reference types="../../support" />

import { designer } from '../../pageobjects/designer';
import Common from '../../pageobjects/common';
import { header } from '../../pageobjects/header';
import { dashboard } from '../../pageobjects/dashboard';
import { builds } from '../../fixtures/builds';
import { deploys } from '../../fixtures/deploys';

const common = new Common();

context('Deploy', () => {
  before(() => {
    if (Cypress.env('environment') == 'local') {
      cy.visit('/');
      cy.studiologin(Cypress.env('autoTestUser'), Cypress.env('autoTestUserPwd'));
      cy.createapp(Cypress.env('appOwner'), 'deploy');
      cy.get(header.profileButton).click();
      cy.contains(header.menuItem, 'Logout').click();
    }
  });
  beforeEach(() => {
    cy.visit('/');
    cy.studiologin(Cypress.env('autoTestUser'), Cypress.env('autoTestUserPwd'));
    var appName = Cypress.env('deployApp').split('/')[1];
    cy.get(dashboard.searchApp).type(appName);
    cy.contains(dashboard.apps.name, appName).siblings(dashboard.apps.links).find(dashboard.apps.edit).click();
    cy.get(designer.appMenu['deploy']).click();
  });

  it('Inprogress build', () => {
    cy.intercept('GET', `**/designer/api/v1/${Cypress.env('deployApp')}/releases**`, builds('inprogress')).as(
      'buildstatus',
    );
    cy.wait('@buildstatus').its('response.statusCode').should('eq', 200);
    cy.contains(common.gridItem, designer.olderBuilds)
      .next(common.gridContainer)
      .then(($builds) => {
        cy.get($builds).children().first().find(designer.inprogressSpinner).should('be.visible');
      });
  });

  it('Failed build', () => {
    cy.intercept('GET', `**/designer/api/v1/${Cypress.env('deployApp')}/releases**`, builds('failed')).as(
      'buildstatus',
    );
    cy.wait('@buildstatus').its('response.statusCode').should('eq', 200);
    cy.contains(common.gridItem, designer.olderBuilds)
      .next(common.gridContainer)
      .then(($builds) => {
        cy.get($builds).children().first().find(designer.failedCheck).should('be.visible');
      });
  });

  it('Successful build', () => {
    cy.intercept('GET', `**/designer/api/v1/${Cypress.env('deployApp')}/releases**`, builds('succeeded')).as(
      'buildstatus',
    );
    cy.wait('@buildstatus').its('response.statusCode').should('eq', 200);
    cy.contains(common.gridItem, designer.olderBuilds)
      .next(common.gridContainer)
      .then(($builds) => {
        cy.get($builds).children().first().find(designer.successCheck).should('be.visible');
      });
  });

  it('App Deploy', () => {
    cy.intercept('GET', '**/designer/api/v1/*/*/Deployments**', deploys()).as('deploys');
    cy.wait('@deploys').its('response.statusCode').should('eq', 200);
    cy.contains('div', 'AT22').should('be.visible');
    cy.get(designer.deployHistory.at22).find('tbody > tr').should('contain.text', 'testuser');
  });
});
