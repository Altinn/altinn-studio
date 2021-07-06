/// <reference types='cypress' />
/// <reference types="../../support" />

import AppFrontend from '../../pageobjects/app-frontend';
import Common from '../../pageobjects/common';

const appFrontend = new AppFrontend();
const mui = new Common();

describe('Group', () => {
  before(() => {
    cy.navigateToTask3();
    cy.get(appFrontend.group.showGroupToContinue).should('be.visible');
  });
  beforeEach(() => {
    cy.preserveCookies();
  });

  it('Dynamics on group', () => {
    cy.get(appFrontend.group.addNewItem).should('not.exist');
    cy.get(appFrontend.group.showGroupToContinue).find('input').check();
    cy.get(appFrontend.group.addNewItem).should('exist').and('be.visible');
  });

  it('Add Item to Group', () => {
    cy.get(appFrontend.group.addNewItem).should('be.visible').click();
    cy.get(appFrontend.group.currentValue).type('1').blur();
    cy.get(appFrontend.group.newValue).type('2').blur();
    cy.get(appFrontend.group.saveMainGroup).should('be.visible').click().should('not.exist');
    cy.get(appFrontend.group.mainGroup)
      .find(mui.tableBody)
      .then((table) => {
        cy.get(table).find(mui.tableElement).first().invoke('text').should('equal', '1');
        cy.get(table).find(mui.tableElement).eq(1).invoke('text').should('equal', '2');
      });
  });

  it('Add Item to Nested Group', () => {
    cy.get(appFrontend.group.mainGroup)
      .find(mui.tableBody)
      .then((table) => {
        cy.get(table).find(mui.tableElement).find(mui.buttonIcon).should('be.visible').click();
      });
    cy.get(appFrontend.group.mainGroup)
      .siblings(appFrontend.group.editContainer)
      .find(appFrontend.group.next)
      .should('be.visible')
      .click();
    cy.get(appFrontend.group.addNewItem).should('be.visible').click();
    cy.get(appFrontend.group.comments).type('automation');
    cy.get(appFrontend.group.saveSubGroup).should('be.visible').click().should('not.exist');
    cy.get(appFrontend.group.subGroup)
      .find(mui.tableBody)
      .then((table) => {
        cy.get(table).find(mui.tableElement).first().invoke('text').should('equal', 'automation');
      });
  });

  it('Delete Item from Nested Group', () => {
    cy.get(appFrontend.group.subGroup)
      .find(mui.tableBody)
      .then((table) => {
        cy.get(table).find(mui.tableElement).find(mui.buttonIcon).should('be.visible').click();
      });
    cy.get(appFrontend.group.subGroup)
      .siblings(appFrontend.group.editContainer)
      .find(appFrontend.group.delete)
      .should('be.visible')
      .click();
    cy.get(appFrontend.group.mainGroup)
      .siblings(appFrontend.group.editContainer)
      .find(appFrontend.group.back)
      .should('be.visible')
      .click();
    cy.get(appFrontend.group.currentValue).should('be.visible');
    cy.get(appFrontend.group.saveSubGroup).should('not.exist');
    cy.get(appFrontend.group.saveMainGroup).should('be.visible').click().should('not.exist');
  });

  it('Delete Item from Main Group', () => {
    cy.get(appFrontend.group.mainGroup)
      .find(mui.tableBody)
      .then((table) => {
        cy.get(table).find(mui.tableElement).find(mui.buttonIcon).should('be.visible').click();
      });
    cy.get(appFrontend.group.mainGroup)
      .siblings(appFrontend.group.editContainer)
      .find(appFrontend.group.delete)
      .should('be.visible')
      .click();
    cy.get(appFrontend.group.saveMainGroup).should('not.exist');
    cy.get(appFrontend.group.mainGroup)
      .find(mui.tableBody)
      .then((table) => {
        cy.get(table).get(mui.tableElement).should('have.length', 0);
      });
  });

  it('Calculation on Item in Main Group should update value', () => {
    cy.get(appFrontend.group.addNewItem).should('be.visible').click();
    cy.get(appFrontend.group.currentValue).should('be.visible').type('1337').blur();
    // CalculationHandler.cs for frontend-test changes 1337 to 1338.
    cy.get(appFrontend.group.currentValue).should('have.value', 'NOK 1 338');
    // Deletes value from group
    cy.get(appFrontend.group.mainGroup)
      .siblings(appFrontend.group.editContainer)
      .find(appFrontend.group.delete)
      .should('be.visible')
      .click();
    cy.get(appFrontend.group.saveMainGroup).should('not.exist');
    cy.get(appFrontend.group.mainGroup)
      .find(mui.tableBody)
      .then((table) => {
        cy.get(table).get(mui.tableElement).should('not.exist');
      });
  });
});
