/* eslint-disable cypress/no-unnecessary-waiting */
/// <reference types="cypress" />
/// <reference types="../../support" />

import { designer } from '../../pageobjects/designer';

if (Cypress.env('environment') != 'local') {
  context('Sync app and deploy', () => {
    beforeEach(() => {
      cy.intercept('GET', '**/status').as('getRepoStatus');
      cy.intercept('POST', '**/commit').as('commitChanges');
      cy.intercept('GET', '**/pull').as('pullChanges');
      cy.intercept('POST', '**/push').as('pushChanges');
      cy.intercept('GET', '**/releases**').as('getAppBuilds');
      cy.intercept('POST', '**/releases**').as('startAppBuild');
      cy.intercept('GET', '**/Deployments**').as('getAppDeploys');
    });
    it('is possible sync changes, build and deploy app', () => {
      cy.visit('/');
      cy.studiologin(Cypress.env('autoTestUser'), Cypress.env('autoTestUserPwd'));
      cy.searchAndOpenApp(Cypress.env('deployApp'));

      // Sync app changes
      cy.get(designer.appMenu.edit).click();
      cy.deletecomponents();
      cy.get(designer.formComponents.shortAnswer).parents(designer.draggable).trigger('dragstart');
      cy.get(designer.dragToArea).parents(designer.draggable).trigger('drop');
      cy.wait('@getRepoStatus').its('response.statusCode').should('eq', 200);
      cy.get(designer.syncApp.push).scrollIntoView().isVisible();
      cy.get(designer.syncApp.push).click();
      cy.get(designer.syncApp.commitMessage).should('be.visible').clear().type('automation');
      cy.get(designer.syncApp.pushButton).should('be.visible').click();
      cy.wait('@commitChanges').its('response.statusCode').should('eq', 200);
      cy.wait('@pullChanges').its('response.statusCode').should('eq', 200);
      cy.get(designer.syncApp.pushButton).should('be.visible').click();
      cy.wait('@pushChanges').its('response.statusCode').should('eq', 200);
      cy.get(designer.syncApp.pushSuccess).isVisible();
      cy.reload();

      // Start app build
      cy.get(designer.appMenu.deploy).click();
      cy.wait('@getAppBuilds').then((res) => {
        expect(res.response.statusCode).to.eq(200);
        var builds = res.response.body;
        var latestBuildTag = builds.results[0].tagName;
        cy.get(designer.build.versionNum)
          .scrollIntoView()
          .clear()
          .type(`${parseInt(latestBuildTag) + 1}`);
        cy.get(designer.build.versionDesc).clear().type('automation');
        cy.contains('button', 'Bygg versjon').should('be.visible').focus().click();
        cy.wait('@startAppBuild').its('response.statusCode').should('eq', 201);
      });

      cy.wait('@getAppDeploys').its('response.statusCode').should('eq', 200);
      // Wait before starting app deploy
      cy.wait(20000);

      // Start app deploy
      var deployVerions =
        Cypress.env('environment') != 'prod' ? designer.deploy.at22Versions : designer.deploy.prodVersions;
      var deployButton = Cypress.env('environment') != 'prod' ? designer.deploy.at22Deploy : designer.deploy.prodDeploy;
      cy.get(deployVerions).scrollIntoView().find('.select__indicators').should('be.visible').click();
      cy.get(designer.deploy.versions).scrollIntoView().children().should('have.length.above', 0);
      cy.get(designer.deploy.latestBuild).scrollIntoView().click();
      cy.get(deployButton).should('be.visible').focus().click();
      cy.get(designer.deploy.confirm).should('be.visible').focus().click();
      cy.wait('@getAppDeploys').its('response.statusCode').should('eq', 200);
      cy.wait(5000);
      cy.get(deployVerions).siblings().find(designer.inprogressSpinner).should('be.visible');
    });
  });
}
