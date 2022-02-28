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
});
