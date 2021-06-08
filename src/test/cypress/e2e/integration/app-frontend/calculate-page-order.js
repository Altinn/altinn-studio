/// <reference types='cypress' />
/// <reference types="../../support" />

import AppFrontend from '../../pageobjects/app-frontend';
import Common from '../../pageobjects/common';
import * as texts from '../../fixtures/texts.json';

const appFrontend = new AppFrontend();
const mui = new Common();

describe('Calculate Page Order', () => {
  before(() => {
    cy.navigateToTask3();
    cy.get(appFrontend.group.showGroupToContinue).then((checkbox) => {
      cy.get(checkbox).should('be.visible').find('input').check();
    });
  });
  beforeEach(() => {
    cy.preserveCookies();
  });

  it('Page two is hidden on a higher value', () => {
    cy.get(appFrontend.group.addNewItem).should('be.visible').click();
    cy.get(appFrontend.group.currentValue).type('1');
    cy.get(appFrontend.group.newValue).type('11');
    cy.get(appFrontend.group.mainGroup)
      .siblings(appFrontend.group.editContainer)
      .find(appFrontend.group.next)
      .should('be.visible')
      .click();
    cy.get(appFrontend.group.addNewItem).should('be.visible').click();
    cy.get(appFrontend.group.comments).type('automation');
    cy.get(appFrontend.group.saveMainGroup).should('be.visible').click().should('not.exist');
    cy.intercept('POST', '**/pages/order*').as('getPageOrder');
    cy.contains(mui.button, texts.next).click();
    cy.wait('@getPageOrder');
    cy.get(appFrontend.group.sendersName).should('not.exist');
    cy.get(appFrontend.group.summaryText).should('be.visible');
  });

  it('Page two is shown when condition is not satisfied', () => {
    cy.get(appFrontend.group.summaryText).should('be.visible');
    cy.get(appFrontend.backButton).click();
    cy.get(appFrontend.group.mainGroup)
      .find(mui.tableBody)
      .then((table) => {
        cy.get(table).find(mui.tableElement).find(mui.buttonIcon).should('be.visible').click();
      });
    cy.get(appFrontend.group.newValue).clear().type('2');
    cy.get(appFrontend.group.saveMainGroup).should('be.visible').click().should('not.exist');
    cy.intercept('POST', '**/pages/order*').as('getPageOrder');
    cy.contains(mui.button, texts.next).click();
    cy.wait('@getPageOrder');
    cy.get(appFrontend.group.sendersName).should('exist');
  });
});
