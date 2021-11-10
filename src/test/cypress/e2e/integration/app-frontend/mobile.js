/// <reference types='cypress' />
/// <reference types="../../support" />

import AppFrontend from '../../pageobjects/app-frontend';
import Common from '../../pageobjects/common';
import * as texts from '../../fixtures/texts.json';

const appFrontend = new AppFrontend();
const mui = new Common();

describe.only('Mobile', () => {
  beforeEach(() => {
    cy.viewport('samsung-s10');
  });

  it('is possible to submit app instance from mobile', () => {
    cy.navigateToChangeName();
    cy.get(appFrontend.changeOfName.oldFullName).parents().eq(2).should('have.css', 'max-width', '100%');
    cy.completeChangeNameForm('a', 'a');
    cy.intercept('**/api/layoutsettings/group').as('getLayoutGroup');
    cy.get(appFrontend.sendinButton)
      .should('be.visible')
      .invoke('outerWidth')
      .then((width) => {
        width = Math.round(width);
        expect(width).to.be.gt(292);
        expect(width).to.be.lt(296);
      });
    cy.wait('@getLayoutGroup');
    cy.get(appFrontend.group.showGroupToContinue).then((checkbox) => {
      cy.get(checkbox).should('be.visible').find('input').check();
    });
    cy.addItemToGroup(1, 2, 'automation');
    cy.contains(mui.button, texts.next).click();
    cy.get(appFrontend.group.sendersName).should('be.visible').type('automation');
    cy.contains(mui.button, texts.next).click();
    cy.get(appFrontend.sendinButton).should('be.visible').click();
    cy.get(appFrontend.confirmContainer).should('be.visible');
    cy.intercept('GET', '**/orgs/altinn-orgs.json').as('getAltinnOrgs');
    cy.get(appFrontend.confirmSendInButton).should('be.visible').click();
    cy.wait('@getAltinnOrgs');
    cy.get(appFrontend.receiptContainer).should('be.visible');
    cy.get(appFrontend.linkToArchive).should('be.visible');
  });
});
