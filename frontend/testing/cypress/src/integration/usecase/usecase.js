/* eslint-disable cypress/no-unnecessary-waiting */
/// <reference types="cypress" />
/// <reference types="../../support" />

import * as texts from "@altinn-studio/language/src/nb.json";
import { administration } from "../../selectors/administration";
import { deploy } from "../../selectors/deploy";
import { designer } from "../../selectors/designer";
import { gitea } from "../../selectors/gitea";
import { header } from '../../selectors/header';
import { preview } from "../../selectors/preview";
import { textEditor } from "../../selectors/textEditor";

context(
  'Bruksmønster',
  {
    retries: {
      runMode: 2,
    },
  },
  () => {
    before(() => {
      cy.studiologin(Cypress.env('useCaseUser'), Cypress.env('useCaseUserPwd'));
      cy.getrepo(Cypress.env('deployApp'), Cypress.env('accessToken')).then((response) => {
        if (response.status === 404) {
          const [_, appName] = Cypress.env('deployApp').split('/');
          cy.createapp('Testdepartementet', appName);
        }
      });
    });
    beforeEach(() => {
      cy.studiologin(Cypress.env('useCaseUser'), Cypress.env('useCaseUserPwd'));
      cy.visit('/');
      cy.searchAndOpenApp(Cypress.env('deployApp'));
      administration.getHeader().should('be.visible');
    });

    it('Navigation', () => {
      // About app page
      administration
        .getAppNameField()
        .invoke('val')
        .should('contain', Cypress.env('deployApp').split('/')[1]);

      // Forms editor
      header.getCreateLink().click();
      designer.getToolbarItemByText(texts['ux_editor.component_input']).should('be.visible');

      // Text editor
      header.getTextEditorLink().should('be.visible').click();
      textEditor.getNewTextButton().should('be.visible');

      // Preview
      header.getPreviewButton().should('be.visible').click();
      cy.visit('/preview/' + Cypress.env('deployApp'));
      preview.getBackToEditorButton().should('be.visible').click();

      // Repos
      header.getProfileIcon().should('be.visible').click();
      header.getOpenRepoLink().should('be.visible').invoke('attr', 'href').then(href => {
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
  }
);
