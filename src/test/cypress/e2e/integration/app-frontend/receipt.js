/// <reference types='cypress' />

import AppFrontend from '../../pageobjects/app-frontend';
import Common from '../../pageobjects/common'
import * as texts from '../../fixtures/texts.json'
const mui = new Common();

const appName = Cypress.env('localTestAppName');
const af = new AppFrontend();

describe('Receipt', () => {
  before(() => {
    cy.navigateToChangeName(appName);
  });

  //Tests the receipt page after submitting the app instance
  it('Receipt', () => {
    cy.completeChangeNameForm('a', 'a');
    cy.get(af.backButton).should('be.visible');
    cy.get(af.sendinButton).should('be.visible').click();
    cy.get(af.receiptContainer).should('be.visible')
      .find(mui.tableBody).then((table) => {
        cy.get(table).should('exist').and('be.visible');
        cy.get(table).contains(mui.tableElement, 'Mottaker').siblings().should('contain.text', texts.ttd);
      });
    cy.get(af.linkToArchive).should('be.visible');
    cy.get(mui.listedAnchor).should('be.visible').and('have.length', 2);
  });

});