/// <reference types='cypress' />
/// <reference types="../../support" />

import AppFrontend from '../../pageobjects/app-frontend';
import Common from '../../pageobjects/common';
import * as texts from '../../fixtures/texts.json';

const appFrontend = new AppFrontend();
const mui = new Common();

describe('Calculate Page Order', () => {
  beforeEach(() => {
    cy.navigateToTask3();
    cy.get(appFrontend.group.showGroupToContinue).then((checkbox) => {
      cy.get(checkbox).should('be.visible').find('input').check();
    });
    cy.intercept('POST', '**/pages/order*').as('getPageOrder');
  });

  it('Page two is hidden on a higher value', () => {
    cy.addItemToGroup(1, 11, 'automation');
    cy.contains(mui.button, texts.next).click();
    cy.wait('@getPageOrder');
    cy.get(appFrontend.group.sendersName).should('not.exist');
    cy.get(appFrontend.group.summaryText).should('be.visible');
  });

  it('Page two is shown when condition is not satisfied', () => {
    cy.addItemToGroup(1, 2, 'automation');
    cy.contains(mui.button, texts.next).click();
    cy.wait('@getPageOrder');
    cy.get(appFrontend.group.sendersName).should('exist');
  });
});
