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
    cy.get(appFrontend.confirmSendInButton).should('be.visible').click();
    cy.get(appFrontend.receiptContainer)
      .should('be.visible')
      .find(mui.tableBody)
      .then((table) => {
        cy.get(table).should('exist').and('be.visible');
        cy.get(table).contains(mui.tableElement, 'Mottaker').siblings().should('contain.text', texts.ttd);
      });
    cy.get(appFrontend.linkToArchive).should('be.visible');
    cy.get(mui.listedAnchor).should('be.visible').and('have.length', 3);
    cy.get('body').should('have.css', 'background-color', 'rgb(212, 249, 228)');
  });
});
