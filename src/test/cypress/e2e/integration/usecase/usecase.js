/* eslint-disable cypress/no-unnecessary-waiting */
/// <reference types="cypress" />
/// <reference types="../../support" />

import * as designer from '../../pageobjects/designer';

context(
  'Bruksmønster',
  {
    retries: {
      runMode: 2,
    },
  },
  () => {
    before(() => {
      cy.visit('/');
      cy.studiologin(Cypress.env('useCaseUser'), Cypress.env('useCaseUserPwd'));
    });
    beforeEach(() => {
      cy.intercept(/(s|RepoS)tatus/).as('repoStatus');
      Cypress.Cookies.preserveOnce('AltinnStudioDesigner', 'i_like_gitea', 'XSRF-TOKEN', 'AS-XSRF-TOKEN');
      cy.visit(`designer/${Cypress.env('deployApp')}#/about`);
      cy.wait('@repoStatus');
      cy.get(designer.layOutContainer).should('be.visible');
    });

    it('Navigation', () => {
      cy.get(designer.aboutApp.repoName)
        .find('input')
        .invoke('val')
        .should('contain', Cypress.env('deployApp').split('/')[1]);
      cy.get(designer.appMenu.edit).should('be.visible').click();
      cy.get(designer.formComponents.shortAnswer).parentsUntil(designer.draggable).should('be.visible');
      cy.get(designer.appMenu.texts).should('be.visible').click();
      cy.getIframeBody().find('#tabs').should('be.visible');
      cy.getIframeBody().find('#saveTextsBtn').should('be.visible');
    });

    it('Gitea connection - Pull changes', () => {      
      cy.deleteLocalChanges(Cypress.env('deployApp'));
      cy.wait(5000);
      cy.intercept(/(P|p)ull/).as('pullChanges');
      cy.get(designer.syncApp.pull).should('be.visible').click();
      cy.wait('@pullChanges');
      cy.get('h3').contains('Appen din er oppdatert til siste versjon').should('be.visible');
    });

    it('App builds and deploys', () => {
      cy.intercept('**/Deployments*').as('deploys');
      cy.get(designer.appMenu.deploy).should('be.visible').click();
      cy.wait('@deploys').its('response.statusCode').should('eq', 200);
      var checkDeployOf = Cypress.env('environment') == 'prod' ? 'prod' : 'at22';
      cy.get(designer.deployHistory[checkDeployOf]).then((table) => {
        cy.get(table).isVisible();
        cy.get(table).find('tbody > tr').should('have.length.gte', 1);
      });
    });
  },
);
