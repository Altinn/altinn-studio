/// <reference types="cypress" />
/// <reference types="../../support" />

import * as texts from '@altinn-studio/language/src/nb.json';
import { overview } from '../../selectors/overview';
import { deploy } from '../../selectors/deploy';
import { designer } from '../../selectors/designer';
import { gitea } from '../../selectors/gitea';
import { header } from '../../selectors/header';
import { preview } from '../../selectors/preview';
import { textEditor } from '../../selectors/textEditor';

context(
  'Bruksmønster',
  {
    retries: {
      runMode: 2,
    },
  },
  () => {
    before(() => {
      cy.studioLogin(Cypress.env('useCaseUser'), Cypress.env('useCaseUserPwd'));
      const deployAppId = `${Cypress.env('orgUserName')}/${Cypress.env('deployAppName')}`;
      cy.deleteApp(
        Cypress.env('orgUserName'),
        Cypress.env('deployAppName'),
        Cypress.env('accessToken'),
      );
      cy.createApp(Cypress.env('orgFullName'), Cypress.env('deployAppName'));
    });
    beforeEach(() => {
      cy.studioLogin(Cypress.env('useCaseUser'), Cypress.env('useCaseUserPwd'));
      cy.visit('/');
      cy.searchAndOpenApp(Cypress.env('deployAppName'));
      overview.getHeader(Cypress.env('deployAppName')).should('be.visible');
    });

    it('Navigation', () => {
      cy.intercept('GET', '**/app-development/layout-settings?**').as('getLayoutSettings');
      cy.intercept('POST', '**/app-development/layout-settings?**').as('postLayoutSettings');

      // About app page
      overview.getHeader(Cypress.env('deployAppName')).should('be.visible');

      // Forms editor
      header.getCreateLink().click();
      designer.getAddPageButton().click();
      cy.wait('@postLayoutSettings').its('response.statusCode').should('eq', 200);
      cy.wait('@getLayoutSettings').its('response.statusCode').should('eq', 200);
      designer.getToolbarItemByText(texts['ux_editor.component_title.Input']).should('be.visible');

      // Text editor
      header.getTextEditorLink().should('be.visible').click();
      textEditor.getNewTextButton().should('be.visible');

      // Preview
      header.getPreviewButton().should('be.visible').click();
      cy.visit(`/preview/${Cypress.env('orgUserName')}/${Cypress.env('deployAppName')}`);
      preview.getBackToEditorButton().should('be.visible').click();

      // Profile
      header.getProfileIcon().should('be.visible').click();

      // Repos
      header
        .getOpenRepoLink()
        .should('be.visible')
        .invoke('attr', 'href')
        .then((href) => {
          cy.visit(href);
          gitea.getRepositoryHeader().should('be.visible');
        });
    });

    // it('Gitea connection - Pull changes', () => {
    //   cy.deleteLocalChanges(Cypress.env('deployApp'));
    //   cy.wait(5000);
    //   cy.intercept(/(P|p)ull/).as('pullChanges');
    //   cy.get(designer.syncApp.pull).should('be.visible').click();
    //   cy.wait('@pullChanges');
    //   cy.get('h3').contains('Appen din er oppdatert til siste versjon').should('be.visible');
    // });

    it('App builds and deploys', () => {
      cy.intercept('**/deployments*').as('deploys');
      header.getDeployButton().should('be.visible').click();
      cy.wait('@deploys').its('response.statusCode').should('eq', 200);
      const checkDeployOf = Cypress.env('environment') === 'prod' ? 'prod' : 'at22';
      deploy.getDeployHistoryTable(checkDeployOf).then((table) => {
        cy.get(table).isVisible();
        cy.get(table).find('tbody > tr').should('have.length.gte', 1);
      });
    });
  },
);
