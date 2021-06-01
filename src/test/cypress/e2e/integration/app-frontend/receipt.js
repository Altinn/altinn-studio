/// <reference types='cypress' />
/// <reference types="../../support" />

import AppFrontend from '../../pageobjects/app-frontend';
import Common from '../../pageobjects/common';
import * as texts from '../../fixtures/texts.json';

const mui = new Common();
const appFrontend = new AppFrontend();

describe('Receipt', () => {
  before(() => {
    cy.navigateToTask4();
  });

  it('Receipt page displays links and attachments', () => {
    cy.intercept('GET', '**/orgs/altinn-orgs.json').as('getAltinnOrgs');
    cy.get(appFrontend.confirmSendInButton).should('be.visible').click();
    cy.wait('@getAltinnOrgs');
    cy.get(appFrontend.receiptContainer)
      .should('be.visible')
      .find(mui.tableBody)
      .then((table) => {
        cy.get(table).should('exist').and('be.visible');
        cy.get(table).contains(mui.tableElement, 'Mottaker').siblings().should('contain.text', texts.ttd);
      });
    cy.get(appFrontend.linkToArchive).should('be.visible');
    cy.get(mui.listedAnchor).should('be.visible').and('have.length', 3);
  });
});
