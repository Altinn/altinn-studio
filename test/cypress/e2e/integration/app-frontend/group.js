/// <reference types='cypress' />
/// <reference types="../../support" />

import AppFrontend from '../../pageobjects/app-frontend';
import Common from '../../pageobjects/common';
import * as texts from '../../fixtures/texts.json';

const appFrontend = new AppFrontend();
const mui = new Common();

describe('Group', () => {
  const init = () => {
    cy.navigateToTask3();
    cy.contains(mui.button, texts.next).click();
    cy.get(appFrontend.group.showGroupToContinue).should('be.visible');
  };

  it('Dynamics on group', () => {
    init();
    cy.get(appFrontend.group.addNewItem).should('not.exist');
    cy.get(appFrontend.group.showGroupToContinue).find('input').check();
    cy.get(appFrontend.group.addNewItem).should('exist').and('be.visible');
  });

  [true, false].forEach((openByDefault) => {
    it(`Add and delete items on main and nested group (openByDefault = ${openByDefault ? 'true' : 'false'})`, () => {
      cy.interceptLayout('group', (component) => {
        if (component.edit && typeof component.edit.openByDefault === 'boolean') {
          component.edit.openByDefault = openByDefault;
        }
        return component;
      });
      init();

      cy.get(appFrontend.group.showGroupToContinue).find('input').check();
      cy.addItemToGroup(1, 2, 'automation', openByDefault);
      cy.get(appFrontend.group.mainGroup)
        .find(mui.tableBody)
        .then((table) => {
          cy.get(table).find(mui.tableElement).first().invoke('text').should('equal', '1');
          cy.get(table).find(mui.tableElement).eq(1).invoke('text').should('equal', '2');
          cy.get(table).find(mui.tableElement).find(mui.buttonIcon).first().should('be.visible').click();
        });
      cy.get(appFrontend.group.mainGroup)
        .siblings(appFrontend.group.editContainer)
        .find(appFrontend.group.next)
        .should('be.visible')
        .click();
      cy.get(appFrontend.group.subGroup)
        .find(mui.tableBody)
        .then((table) => {
          cy.get(table).find(mui.tableElement).first().invoke('text').should('equal', 'automation');
          cy.get(table).find(mui.tableElement).find(mui.buttonIcon).first().should('be.visible').click();
          cy.get(table).find(mui.tableElement).find(appFrontend.group.delete).should('be.visible').click();
        });

      if (openByDefault) {
        cy.get(appFrontend.group.subGroup).find(mui.tableElement).eq(0).should('not.contain.text', 'automation');
        cy.get(appFrontend.group.comments).should('be.visible');
      } else {
        cy.get(appFrontend.group.subGroup).find(mui.tableElement).should('have.length', 0);
        cy.get(appFrontend.group.comments).should('not.exist');
      }

      cy.get(appFrontend.group.mainGroup)
        .siblings(appFrontend.group.editContainer)
        .find(appFrontend.group.back)
        .should('be.visible')
        .click();
      cy.get(appFrontend.group.mainGroup)
        .find(mui.tableBody)
        .then((table) => {
          cy.get(table).find(mui.tableElement).find(appFrontend.group.delete)
            .should('be.visible')
            .click();
        });

      if (openByDefault) {
        cy.get(appFrontend.group.saveMainGroup).should('be.visible');
        cy.get(appFrontend.group.mainGroup).find(mui.tableElement).should('have.length.greaterThan', 0);
      } else {
        cy.get(appFrontend.group.saveMainGroup).should('not.exist');
        cy.get(appFrontend.group.mainGroup).find(mui.tableElement).should('have.length', 0);
      }
    });
  });

  it('Calculation on Item in Main Group should update value', () => {
    init();
    cy.get(appFrontend.group.showGroupToContinue).find('input').check();
    cy.get(appFrontend.group.addNewItem).focus().should('be.visible').click();
    cy.get(appFrontend.group.currentValue).should('be.visible').type('1337').blur().tab();
    // DataProcessingHandler.cs for frontend-test changes 1337 to 1338.
    cy.get(appFrontend.group.currentValue).should('have.value', 'NOK 1 338');
    cy.get(appFrontend.group.newValueLabel).should('contain.text', '2. Endre verdi 1338 til');
  });

  it('Validation on group', () => {
    init();
    cy.get(appFrontend.group.showGroupToContinue).find('input').check();
    cy.get(appFrontend.group.addNewItem).should('exist').and('be.visible').focus().click();
    cy.get(appFrontend.group.currentValue).should('be.visible').type('1').blur();
    cy.get(appFrontend.group.newValue).should('be.visible').type('0').blur();
    cy.get(appFrontend.fieldValidationError.replace('field', 'newValue'))
      .should('exist')
      .should('be.visible')
      .should('have.text', texts.zeroIsNotValid);
    cy.get(appFrontend.group.mainGroup).siblings(appFrontend.group.tableErrors).should('contain.text', texts.errorInGroup);
    cy.get(appFrontend.group.newValue).should('be.visible').clear().type('1').blur();
    cy.get(appFrontend.fieldValidationError.replace('field', 'newValue')).should('not.exist');
    cy.get(appFrontend.group.mainGroup).siblings(appFrontend.group.tableErrors).should('not.exist');
    cy.get(appFrontend.group.mainGroup)
      .siblings(appFrontend.group.editContainer)
      .find(appFrontend.group.next)
      .should('be.visible')
      .click();
    cy.get(appFrontend.group.addNewItem).should('not.exist');
    cy.get(appFrontend.group.comments).type('test').blur();
    cy.get(appFrontend.fieldValidationError.replace('field', 'comments'))
      .should('exist')
      .should('be.visible')
      .should('have.text', texts.testIsNotValidValue);
    cy.get(appFrontend.group.subGroup).siblings(appFrontend.group.tableErrors).should('contain.text', texts.errorInGroup);
    cy.get(appFrontend.group.comments).clear().type('automation').blur();
    cy.get(appFrontend.fieldValidationError.replace('field', 'comments')).should('not.exist');
    cy.get(appFrontend.group.subGroup).siblings(appFrontend.group.tableErrors).should('not.exist');
    cy.get(appFrontend.group.mainGroup).siblings(appFrontend.group.tableErrors).should('not.exist');
    cy.get(appFrontend.group.saveSubGroup).should('be.visible').click().should('not.exist');
    cy.get(appFrontend.group.saveMainGroup).should('be.visible').click().should('not.exist');
  });

  it('should support panel group adding item to referenced group', () => {
    init();
    cy.get(appFrontend.group.showGroupToContinue).find('input').check();
    cy.get(appFrontend.group.secondGroup_add).should('exist').and('be.visible').focus().click();
    cy.get(appFrontend.group.secondGroup_add_to_reference_group).should('exist').and('be.visible').focus().click();
    cy.get(appFrontend.group.secondGroup_currentValue).should('be.visible').type('1').blur();
    cy.get(appFrontend.group.secondGroup_newValue).should('be.visible').type('2').blur();
    cy.get(appFrontend.group.secondGroup_save).focus().should('be.visible').click();
    cy.get(appFrontend.group.secondGroup_table).find('tbody').find('tr').its('length').should('eq', 1);
  });

  it('Prefilling repeating group using calculation from server', () => {
    init();
    const expectRows = (...rows) => {
      cy.get(appFrontend.group.mainGroup)
        .find(mui.tableBody)
        .then((table) => {
          if (rows.length) {
            cy.get(table).find('tr').should('have.length', rows.length);
          } else {
            cy.get(table).find('tr').should('not.exist');
          }
          let index = 0;
          for (const row of rows) {
            cy.get(table).find('tr').eq(index).find('td').eq(0).should('contain.text', row[0]);
            cy.get(table).find('tr').eq(index).find('td').eq(1).should('contain.text', row[1]);
            index++;
          }
        });
    };

    cy.get(appFrontend.group.showGroupToContinue).find('input').check();
    expectRows();

    cy.contains(mui.button, texts.prev).click();
    cy.get(appFrontend.group.prefill.liten).click();
    cy.contains(mui.button, texts.next).click();
    expectRows([1, 5]);

    cy.contains(mui.button, texts.prev).click();
    cy.get(appFrontend.group.prefill.middels).click();
    cy.get(appFrontend.group.prefill.svaer).click();
    cy.contains(mui.button, texts.next).click();
    expectRows([1, 5], [120, 350], [80323, 123455]);

    cy.contains(mui.button, texts.prev).click();
    cy.get(appFrontend.group.prefill.middels).click();
    cy.get(appFrontend.group.prefill.svaer).click();
    cy.contains(mui.button, texts.next).click();
    expectRows([1, 5]);

    cy.contains(mui.button, texts.prev).click();
    cy.get(appFrontend.group.prefill.enorm).click();
    cy.get(appFrontend.group.prefill.liten).click();
    cy.contains(mui.button, texts.next).click();
    expectRows([9872345, 18872345]);
  });

  it('Delete group row after validation', () => {
    cy.interceptLayout('group', (component) => {
      if (['currentValue', 'newValue'].includes(component.id)) {
        // Sets these two components to required
        component.required = true;
      }
      return component;
    });
    init();

    cy.get(appFrontend.group.showGroupToContinue).find('input').check();
    cy.get(appFrontend.group.addNewItem).click();
    cy.get(appFrontend.group.saveMainGroup).click();

    cy.get(appFrontend.fieldValidationError.replace('field', 'currentValue-0'))
      .should('be.visible')
      .should('have.text', texts.requiredFieldFromValue);
    cy.get(appFrontend.fieldValidationError.replace('field', 'newValue-0'))
      .should('be.visible')
      .should('have.text', texts.requiredFieldToValue);
    cy.get(appFrontend.group.mainGroup)
      .siblings(appFrontend.group.tableErrors)
      .should('have.text', texts.errorInGroup);

    cy.get(appFrontend.group.mainGroup).find(mui.tableBody).then((table) => {
      cy.get(table)
        .find(appFrontend.group.delete)
        .should('be.visible')
        .click();
    });

    cy.contains(mui.button, texts.next).click();
    cy.get(appFrontend.group.sendersName).should('exist');
  });
});
