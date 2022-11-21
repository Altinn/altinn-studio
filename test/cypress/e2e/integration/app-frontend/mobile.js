/// <reference types='cypress' />
/// <reference types="../../support" />

import AppFrontend from '../../pageobjects/app-frontend';
import Common from '../../pageobjects/common';
import * as texts from '../../fixtures/texts.json';
import { Likert } from '../../pageobjects/likert';

const appFrontend = new AppFrontend();
const mui = new Common();
const likertPage = new Likert();

describe('Mobile', () => {
  beforeEach(() => {
    cy.viewport('samsung-s10');
  });

  it('is possible to submit app instance from mobile', () => {
    cy.goto('changename');
    cy.get(appFrontend.changeOfName.oldFullName).parents().eq(2).should('have.css', 'max-width', '100%');
    cy.gotoAndComplete('changename');
    cy.intercept('**/api/layoutsettings/group').as('getLayoutGroup');
    cy.get(appFrontend.sendinButton)
      .should('be.visible')
      .invoke('outerWidth')
      .then((width) => {
        width = Math.round(width);
        expect(width).to.be.gt(268);
        expect(width).to.be.lt(289);
      });
    cy.get(appFrontend.sendinButton).click();
    cy.wait('@getLayoutGroup');
    cy.contains(mui.button, texts.next).click();
    cy.get(appFrontend.group.showGroupToContinue).then((checkbox) => {
      cy.get(checkbox).should('be.visible').find('input').check();
    });
    cy.addItemToGroup(1, 2, 'automation');
    cy.contains(mui.button, texts.next).click();
    cy.get(appFrontend.group.sendersName).should('be.visible').type('automation');
    cy.get(appFrontend.navMenu).should('have.attr', 'hidden');
    cy.get(appFrontend.group.navigationBarButton)
      .should('be.visible')
      .and('have.attr', 'aria-expanded', 'false')
      .click();
    cy.get(appFrontend.group.navigationBarButton).should('have.attr', 'aria-expanded', 'true');
    cy.get(appFrontend.navMenu).should('not.have.attr', 'hidden');
    cy.get(appFrontend.navMenu).find('li > button').last().click();
    cy.get(appFrontend.navMenu).should('have.attr', 'hidden');
    cy.get(appFrontend.sendinButton).click();
    likertPage.selectRequiredRadiosInMobile();
    cy.sendIn('likert');
    cy.get(appFrontend.confirm.sendIn).should('be.visible').click();
    cy.get(appFrontend.receipt.container).should('be.visible');
    cy.get(appFrontend.receipt.linkToArchive).should('be.visible');
  });
});
