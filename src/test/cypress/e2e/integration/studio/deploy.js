/// <reference types="cypress" />
/// <reference types="../../support" />

import { designer } from '../../pageobjects/designer';
import Common from '../../pageobjects/common';
import { header } from '../../pageobjects/header';
import { builds } from '../../fixtures/builds';
import { deploys } from '../../fixtures/deploys';
import * as texts from '../../fixtures/texts.json';

const common = new Common();

context('Deploy', () => {
  before(() => {
    if (Cypress.env('environment') == 'local') {
      cy.visit('/');
      cy.studiologin(Cypress.env('autoTestUser'), Cypress.env('autoTestUserPwd'));
      cy.createapp(Cypress.env('appOwner'), 'deploy');
      cy.get(header.profileIcon).click();
      cy.get(header.menu.logOut).should('be.visible').click();
    }
  });
  beforeEach(() => {
    cy.visit('/');
    cy.studiologin(Cypress.env('autoTestUser'), Cypress.env('autoTestUserPwd'));
    cy.searchAndOpenApp(Cypress.env('deployApp'));
    cy.get(designer.appMenu['deploy']).click();
  });

  it('is possible to view an inprogress build', () => {
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

  it('is possible to view the status of a failed build', () => {
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

  it('is possible to view status of a successful build', () => {
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

  it('is possible to view history of app deploys', () => {
    if (Cypress.env('environment') == 'local')
      cy.intercept('GET', '**/designer/api/v1/*/*/Deployments**', deploys()).as('deploys');
    if (Cypress.env('environment') != 'prod') {
      cy.contains('div', 'AT22').scrollIntoView().should('be.visible');
      cy.get(designer.deployHistory.at22).find('tbody > tr').should('contain.text', Cypress.env('autoTestUser'));
    } else {
      cy.contains('div', 'PRODUCTION').scrollIntoView().should('be.visible');
      cy.get(designer.deployHistory.prod).find('tbody > tr').should('contain.text', Cypress.env('autoTestUser'));
    }
  });

  it('is not possible to deploy without access', () => {
    if (Cypress.env('environment') == 'local') cy.intercept('GET', '**/permissions', '["AT22"]');
    cy.contains(common.gridContainer, texts.noDeployAccess).should('exist').and('be.visible');
  });
});
