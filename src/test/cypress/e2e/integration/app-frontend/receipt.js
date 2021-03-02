/// <reference types='cypress' />

import AppFrontend from '../../pageobjects/app-frontend';
import Common from '../../pageobjects/common'
import * as texts from '../../fixtures/texts.json'
const mui = new Common();

const appName = Cypress.env('localTestAppName');
const appFrontend = new AppFrontend();

describe('Receipt', () => {
  before(() => {
    cy.navigateToChangeName(appName);
  });

  it('Receipt page displays links and attachments', () => {
    cy.completeChangeNameForm('a', 'a');
    cy.get(appFrontend.backButton).should('be.visible');
    cy.get(appFrontend.sendinButton).should('be.visible').click();
    cy.get(appFrontend.receiptContainer).should('be.visible')
      .find(mui.tableBody).then((table) => {
        cy.get(table).should('exist').and('be.visible');
        cy.get(table).contains(mui.tableElement, 'Mottaker').siblings().should('contain.text', texts.ttd);
      });
    cy.get(appFrontend.linkToArchive).should('be.visible');
    cy.get(mui.listedAnchor).should('be.visible').and('have.length', 2);
  });

});
