/// <reference types='cypress' />
/// <reference types="../../support" />

import AppFrontend from '../../pageobjects/app-frontend';
import Common from '../../pageobjects/common';
import * as texts from '../../fixtures/texts.json';

const mui = new Common();
const appFrontend = new AppFrontend();

describe('Receipt', () => {
  it('Receipt page displays links and attachments', () => {
    cy.navigateToTask4();
    cy.get(appFrontend.confirm.sendIn).should('be.visible').click();
    cy.get(appFrontend.receipt.container)
      .should('be.visible')
      .find(mui.tableBody)
      .then((table) => {
        cy.get(table).should('exist').and('be.visible');
        cy.get(table).contains(mui.tableElement, 'Mottaker').siblings().should('contain.text', texts.ttd);
      });
    cy.get(appFrontend.receipt.linkToArchive).should('be.visible');
    cy.get(appFrontend.receipt.pdf)
      .find('a')
      .should('have.length', 3)
      .first()
      .should('contain.text', `${Cypress.env('multiData2Stage')}.pdf`);
    cy.get(appFrontend.receipt.uploadedAttachments)
      .find('a')
      .should('have.length', 1)
      .first()
      .should('contain.text', `test.pdf`);
    cy.get('body').should('have.css', 'background-color', 'rgb(212, 249, 228)');
    cy.get(appFrontend.header).should('contain.text', texts.ttd);
  });

  it('is possible to view simple receipt when auto delete is true', () => {
    cy.intercept('**/api/layoutsettings/stateless').as('getLayoutStateless');
    cy.startAppInstance(Cypress.env('stateless'));
    cy.wait('@getLayoutStateless');
    cy.startStateFullFromStateless();
    cy.intercept('PUT', '**/process/next').as('nextProcess');
    cy.get(appFrontend.sendinButton).should('be.visible').click();
    cy.wait('@nextProcess').its('response.statusCode').should('eq', 200);
    cy.url().then((url) => {
      var instanceId = url.split('/').slice(-2).join('/');
      var requestUrl =
        Cypress.env('environment') === 'local'
          ? `${Cypress.env('baseUrl')}`
          : `https://ttd.apps.${Cypress.config('baseUrl').slice(8)}`;
      requestUrl += `/ttd/${Cypress.env('stateless')}/instances/${instanceId}/process/next`;
      cy.getCookie('XSRF-TOKEN').then((xsrfToken) => {
        cy.request({
          method: 'PUT',
          url: requestUrl,
          headers: {
            'X-XSRF-TOKEN': xsrfToken.value,
          },
        })
          .its('status')
          .should('eq', 200);
      });
      cy.get(appFrontend.receipt.container).should('contain.text', texts.securityReasons);
    });
  });
});
