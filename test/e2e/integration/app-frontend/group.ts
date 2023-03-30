import texts from 'test/e2e/fixtures/texts.json';
import { AppFrontend } from 'test/e2e/pageobjects/app-frontend';
import { Common } from 'test/e2e/pageobjects/common';

import { Triggers } from 'src/types';

const appFrontend = new AppFrontend();
const mui = new Common();

describe('Group', () => {
  const init = () => {
    cy.goto('group');
    cy.get(appFrontend.nextButton).click();
    cy.get(appFrontend.group.showGroupToContinue).should('be.visible');
  };

  it('Dynamics on group', () => {
    cy.interceptLayout('group', (component) => {
      if (component.type === 'Group') {
        component.tableHeaders = [];
      }
    });

    init();
    cy.get(appFrontend.group.addNewItem).should('not.exist');
    cy.get(appFrontend.group.showGroupToContinue).find('input').dsCheck();
    cy.get(appFrontend.group.addNewItem).click();

    // Make sure group is still visible even without table headers
    cy.get(appFrontend.group.currentValue).should('be.visible');
  });

  [true, false].forEach((openByDefault) => {
    it(`Add and delete items on main and nested group (openByDefault = ${openByDefault ? 'true' : 'false'})`, () => {
      cy.interceptLayout('group', (component) => {
        if (component.type === 'Group' && component.edit && typeof component.edit.openByDefault !== 'undefined') {
          component.edit.openByDefault = openByDefault;
        }
      });
      init();

      cy.get(appFrontend.group.showGroupToContinue).find('input').dsCheck();
      cy.addItemToGroup(1, 2, 'automation', openByDefault);
      cy.get(appFrontend.group.mainGroup)
        .find(mui.tableBody)
        .then((table) => {
          cy.wrap(table).find(mui.tableElement).first().invoke('text').should('equal', 'NOK 1');
          cy.wrap(table).find(mui.tableElement).eq(1).invoke('text').should('equal', 'NOK 2');
          cy.wrap(table).find(mui.tableElement).find(appFrontend.group.edit).click();
        });
      cy.get(appFrontend.group.mainGroup)
        .find(appFrontend.group.editContainer)
        .find(appFrontend.group.next)

        .click();
      cy.get(appFrontend.group.subGroup)
        .find(mui.tableBody)
        .then((table) => {
          cy.wrap(table).find(mui.tableElement).first().invoke('text').should('equal', 'automation');
          cy.wrap(table).find(mui.tableElement).find(appFrontend.group.edit).click();
          cy.wrap(table).find(mui.tableElement).find(appFrontend.group.delete).click();
        });

      if (openByDefault) {
        cy.get(appFrontend.group.subGroup).find(mui.tableElement).eq(0).should('not.contain.text', 'automation');
        cy.get(appFrontend.group.comments).should('be.visible');
      } else {
        cy.get(appFrontend.group.subGroup).find(mui.tableElement).should('have.length', 0);
        cy.get(appFrontend.group.addNewItemSubGroup).should('have.length', 1);
        cy.get(appFrontend.group.comments).should('not.exist');
      }

      cy.get(appFrontend.group.mainGroup)
        .find(appFrontend.group.editContainer)
        .find(appFrontend.group.back)

        .click();
      cy.get(appFrontend.group.mainGroup)
        .find(mui.tableBody)
        .then((table) => {
          cy.wrap(table).find(mui.tableElement).find(appFrontend.group.delete).click();
        });

      if (openByDefault) {
        cy.get(appFrontend.group.saveMainGroup).should('be.visible');
        cy.get(appFrontend.group.mainGroup).find(mui.tableElement).should('have.length.greaterThan', 0);
      } else {
        cy.get(appFrontend.group.mainGroup).find(mui.tableElement).should('have.length', 0);
        cy.get(appFrontend.group.saveMainGroup).should('not.exist');
        cy.get(appFrontend.group.addNewItem).should('have.length', 1);
      }
    });
  });

  it('Calculation on Item in Main Group should update value', () => {
    init();
    cy.get(appFrontend.group.showGroupToContinue).find('input').dsCheck();
    cy.get(appFrontend.group.addNewItem).click();
    cy.get(appFrontend.group.currentValue).type('1337').blur();
    // DataProcessingHandler.cs for frontend-test changes 1337 to 1338.
    cy.get(appFrontend.group.currentValue).should('have.value', 'NOK 1 338');
    cy.get(appFrontend.group.newValueLabel).should('contain.text', '2. Endre verdi 1338 til');
  });

  it('Validation on group', () => {
    init();
    cy.get(appFrontend.group.showGroupToContinue).find('input').dsCheck();
    cy.get(appFrontend.group.addNewItem).click();
    cy.get(appFrontend.group.currentValue).type('1').blur();
    cy.get(appFrontend.group.newValue).type('0').blur();
    cy.get(appFrontend.fieldValidationError.replace('field', 'newValue')).should('have.text', texts.zeroIsNotValid);
    cy.get(appFrontend.group.newValue).clear().type('1').blur();
    cy.get(appFrontend.fieldValidationError.replace('field', 'newValue')).should('not.exist');
    cy.get(appFrontend.group.mainGroup).siblings(appFrontend.group.tableErrors).should('not.exist');
    cy.get(appFrontend.group.mainGroup).find(appFrontend.group.editContainer).find(appFrontend.group.next).click();
    cy.get(appFrontend.group.addNewItem).should('not.exist');
    cy.get(appFrontend.group.comments).type('test').blur();
    cy.get(appFrontend.fieldValidationError.replace('field', 'comments')).should(
      'have.text',
      texts.testIsNotValidValue,
    );
    cy.get(appFrontend.group.comments).clear().type('automation').blur();
    cy.get(appFrontend.fieldValidationError.replace('field', 'comments')).should('not.exist');
    cy.get(appFrontend.group.subGroup).siblings(appFrontend.group.tableErrors).should('not.exist');
    cy.get(appFrontend.group.mainGroup).siblings(appFrontend.group.tableErrors).should('not.exist');
    cy.get(appFrontend.group.saveSubGroup).click().should('not.exist');
    cy.get(appFrontend.group.saveMainGroup).click().should('not.exist');
  });

  [Triggers.Validation, Triggers.ValidateRow].forEach((trigger) => {
    it(`Validates group using triggers = ['${trigger}']`, () => {
      cy.intercept('GET', '**/instances/*/*/data/*/validate').as('validate');

      cy.interceptLayout('group', (component) => {
        // Set trigger on main group
        if (component.id === 'mainGroup') {
          component.triggers = [trigger];
        }
        // Remove component triggers and set required
        if (component.id === 'currentValue' || component.id === 'newValue') {
          component.triggers = undefined;
          component.required = true;
        }
      });
      init();

      cy.get(appFrontend.group.showGroupToContinue).find('input').dsCheck();

      cy.get(appFrontend.group.addNewItem).click();
      cy.get(appFrontend.group.currentValue).type('123').blur();
      cy.get(appFrontend.group.newValue).type('1').blur();
      cy.get(appFrontend.group.saveMainGroup).click();

      cy.get(appFrontend.group.addNewItem).click();
      cy.get(appFrontend.group.currentValue).type('123').blur();

      cy.get(appFrontend.group.row(0).editBtn).click();
      cy.get(appFrontend.group.saveMainGroup).click();

      cy.wait('@validate');

      if (trigger === 'validation') {
        cy.get(appFrontend.errorReport)
          .should('contain.text', texts.requiredFieldToValue)
          .should('not.contain.text', texts.requiredFieldFromValue);
      } else {
        cy.get(appFrontend.errorReport).should('not.exist');
        cy.get(appFrontend.group.saveMainGroup).should('not.exist');
      }

      cy.get(appFrontend.group.row(0).editBtn).click();
      cy.get(appFrontend.group.currentValue).clear();
      cy.get(appFrontend.group.currentValue).should('have.value', '');
      cy.get(appFrontend.group.saveMainGroup).click();

      cy.wait('@validate');

      if (trigger === 'validation') {
        cy.get(appFrontend.errorReport)
          .should('contain.text', texts.requiredFieldToValue)
          .should('contain.text', texts.requiredFieldFromValue);
      } else {
        cy.get(appFrontend.errorReport)
          .should('contain.text', texts.requiredFieldFromValue)
          .should('not.contain.text', texts.requiredFieldToValue);
      }
    });
  });

  it('should support panel group adding item to referenced group', () => {
    init();
    cy.get(appFrontend.group.showGroupToContinue).find('input').dsCheck();
    cy.get(appFrontend.group.secondGroup_add).click();
    cy.get(appFrontend.group.secondGroup_add_to_reference_group).click();
    cy.get(appFrontend.group.secondGroup_currentValue).type('1').blur();
    cy.get(appFrontend.group.secondGroup_newValue).type('2').blur();
    cy.get(appFrontend.group.secondGroup_save).click();
    cy.get(appFrontend.group.secondGroup_save_and_close).click();
    cy.get(appFrontend.group.secondGroup_table).find('tbody').find('tr').its('length').should('eq', 1);
  });

  it('Prefilling repeating group using calculation from server', () => {
    init();
    const expectRows = (...rows) => {
      if (!rows.length) {
        cy.get(appFrontend.group.mainGroup).find(mui.tableElement).should('have.length', 0);
        return;
      }
      cy.get(appFrontend.group.mainGroup)
        .find(mui.tableBody)
        .then((table) => {
          if (rows.length) {
            cy.wrap(table).find('tr').should('have.length', rows.length);
          } else {
            cy.wrap(table).find('tr').should('not.exist');
          }
          let index = 0;
          for (const row of rows) {
            cy.wrap(table).find('tr').eq(index).find('td').eq(0).should('contain.text', row[0]);
            cy.wrap(table).find('tr').eq(index).find('td').eq(1).should('contain.text', row[1]);
            index++;
          }
        });
    };

    cy.get(appFrontend.group.showGroupToContinue).find('input').dsCheck();
    expectRows();

    function checkPrefills(items: { [key in keyof typeof appFrontend.group.prefill]?: boolean }) {
      cy.get(appFrontend.prevButton).click();
      for (const item of Object.keys(items)) {
        if (items[item] === true) {
          cy.get(appFrontend.group.prefill[item]).dsCheck();
        } else {
          cy.get(appFrontend.group.prefill[item]).dsUncheck();
        }
      }
      cy.get(appFrontend.nextButton).click();
    }

    checkPrefills({ liten: true });
    expectRows(['NOK 1', 'NOK 5']);

    checkPrefills({ middels: true, svaer: true });
    expectRows(['NOK 1', 'NOK 5'], ['NOK 120', 'NOK 350'], ['NOK 80 323', 'NOK 123 455']);

    checkPrefills({ middels: false, svaer: false });
    expectRows(['NOK 1', 'NOK 5']);

    checkPrefills({ enorm: true, liten: false });
    expectRows(['NOK 9 872 345', 'NOK 18 872 345']);

    checkPrefills({ liten: true });
    expectRows(['NOK 9 872 345', 'NOK 18 872 345'], ['NOK 1', 'NOK 5']);

    cy.get(appFrontend.group.row(0).editBtn).should('have.text', 'Se innhold');
    cy.get(appFrontend.group.row(0).deleteBtn).should('not.exist');
    cy.get(appFrontend.group.row(0).editBtn).click().should('have.text', 'Lukk');
    cy.get(appFrontend.group.saveMainGroup).should('have.text', 'Lukk').click().should('not.exist');

    // The 'liten' row differs, as it should not have a save button on the bottom
    cy.get(appFrontend.group.row(1).editBtn).should('have.text', 'Se innhold');
    cy.get(appFrontend.group.row(1).deleteBtn).should('not.exist');
    cy.get(appFrontend.group.row(1).editBtn).click().should('have.text', 'Lukk');
    cy.get(appFrontend.group.saveMainGroup).should('not.exist');
  });

  it('Delete group row after validation', () => {
    cy.interceptLayout('group', (component) => {
      if (['currentValue', 'newValue'].includes(component.id)) {
        // Sets these two components to required
        component.required = true;
      }
    });
    init();

    cy.get(appFrontend.group.showGroupToContinue).find('input').dsCheck();
    cy.get(appFrontend.group.addNewItem).click();

    cy.get(appFrontend.group.saveMainGroup).click();

    cy.get(appFrontend.fieldValidationError.replace('field', 'currentValue-0')).should(
      'have.text',
      texts.requiredFieldFromValue,
    );

    cy.findByLabelText(/1\. Endre fra/i).type('123');
    cy.get(appFrontend.group.saveMainGroup).click();

    cy.get(appFrontend.fieldValidationError.replace('field', 'newValue-0')).should(
      'have.text',
      texts.requiredFieldToValue,
    );

    cy.get(appFrontend.group.mainGroup)
      .find(mui.tableBody)
      .then((table) => {
        cy.wrap(table).find(appFrontend.group.delete).click();
      });

    cy.get(appFrontend.nextButton).click();
    cy.get(appFrontend.group.sendersName).should('exist');
  });

  it("Open by default on prefilled group (openByDefault = ['first', 'last', true, false])", () => {
    init();

    cy.intercept('PUT', '**/instances/*/*/data/*').as('updateInstance');
    cy.get(appFrontend.group.showGroupToContinue).find('input').dsCheck();
    cy.wait('@updateInstance');

    ['first' as const, 'last' as const, true, false].forEach((openByDefault) => {
      cy.interceptLayout('group', (component) => {
        if (component.type === 'Group' && component.edit && component.edit.openByDefault !== undefined) {
          component.edit.openByDefault = openByDefault;
        }
      });

      cy.log('Testing whether new empty group is opened when openByDefault =', openByDefault);
      cy.reloadAndWait();

      if (openByDefault === 'first' || openByDefault === 'last' || openByDefault) {
        cy.get(appFrontend.group.mainGroupTableBody).children().should('have.length', 2);
        cy.get(appFrontend.group.mainGroupTableBody)
          .children()
          .eq(1)
          .find(appFrontend.group.saveMainGroup)
          .should('exist')
          .and('be.visible');
      } else if (!openByDefault) {
        cy.get(appFrontend.group.mainGroupTableBody).find(appFrontend.group.saveMainGroup).should('not.exist');
      }
    });

    cy.reloadAndWait();

    cy.addItemToGroup(1, 2, 'item 1');
    cy.addItemToGroup(20, 30, 'item 2');
    cy.addItemToGroup(400, 600, 'item 3');

    ['first' as const, 'last' as const, true, false].forEach((openByDefault) => {
      cy.interceptLayout('group', (component) => {
        if (component.type === 'Group' && component.edit && component.edit.openByDefault !== undefined) {
          component.edit.openByDefault = openByDefault;
        }
      });

      cy.log('Testing whether whether existing item is opened when openByDefault =', openByDefault);
      cy.reloadAndWait();

      if (openByDefault === 'first') {
        cy.get(appFrontend.group.mainGroupTableBody).children().should('have.length', 4);
        cy.get(appFrontend.group.mainGroupTableBody)
          .children()
          .eq(1)
          .find(appFrontend.group.saveMainGroup)
          .should('exist')
          .and('be.visible');
      } else if (openByDefault === 'last') {
        cy.get(appFrontend.group.mainGroupTableBody).children().should('have.length', 4);
        cy.get(appFrontend.group.mainGroupTableBody)
          .children()
          .eq(3)
          .find(appFrontend.group.saveMainGroup)
          .should('exist')
          .and('be.visible');
      } else if (openByDefault === true || openByDefault === false) {
        cy.get(appFrontend.group.mainGroupTableBody).children().should('have.length', 3);
        cy.get(appFrontend.group.mainGroupTableBody).find(appFrontend.group.saveMainGroup).should('not.exist');
      }
    });

    cy.interceptLayout('group', (component) => {
      if (component.type === 'Group' && component.edit && component.edit.openByDefault !== undefined) {
        component.edit.openByDefault = true;
      }
    });

    cy.reloadAndWait();

    // Test that deleting an item does not cause another group to open if there are more elements in the group
    cy.get(appFrontend.group.mainGroupTableBody)
      .children()
      .eq(0)
      .find(appFrontend.group.delete)

      .click();
    cy.get(appFrontend.group.mainGroupTableBody).find(appFrontend.group.saveMainGroup).should('not.exist');
  });

  it('Opens delete warning popoup when alertOnDelete is true and deletes on confirm', () => {
    cy.interceptLayout('group', (component) => {
      if (component.type === 'Group' && component.edit && typeof component.edit.openByDefault !== 'undefined') {
        component.edit.alertOnDelete = true;
      }
    });
    init();

    // Add test-data and verify
    cy.get(appFrontend.group.showGroupToContinue).find('input').dsCheck();
    cy.addItemToGroup(1, 2, 'automation');
    cy.get(appFrontend.group.mainGroup)
      .find(mui.tableBody)
      .then((table) => {
        cy.wrap(table).find(mui.tableElement).first().invoke('text').should('equal', 'NOK 1');
        cy.wrap(table).find(mui.tableElement).eq(1).invoke('text').should('equal', 'NOK 2');
        cy.wrap(table).find(mui.tableElement).find(appFrontend.group.edit).click();
      });

    // Navigate to nested group and test delete warning popoup cancel and confirm
    cy.get(appFrontend.group.mainGroup)
      .find(appFrontend.group.editContainer)
      .find(appFrontend.group.next)

      .click();
    cy.get(appFrontend.group.subGroup)
      .find(mui.tableBody)
      .then((table) => {
        cy.wrap(table).find(mui.tableElement).first().invoke('text').should('equal', 'automation');
        cy.wrap(table).find(mui.tableElement).find(appFrontend.group.delete).click();
        cy.wrap(table)
          .find(mui.tableElement)
          .find(appFrontend.designSystemPanel)
          .find(appFrontend.group.popOverCancelButton)

          .click();
        cy.wrap(table).find(mui.tableElement).find(appFrontend.group.delete).click();
        cy.wrap(table)
          .find(mui.tableElement)
          .find(appFrontend.designSystemPanel)
          .find(appFrontend.group.popOverDeleteButton)

          .click();
      });
    cy.get(appFrontend.group.subGroup)
      .find(mui.tableBody)
      .find(mui.tableElement)
      .eq(0)
      .should('not.contain.text', 'automation');

    // Navigate to main group and test delete warning popup cancel and confirm
    cy.get(appFrontend.group.mainGroup)
      .find(appFrontend.group.editContainer)
      .find(appFrontend.group.back)

      .click();
    cy.get(appFrontend.group.mainGroup)
      .find(mui.tableBody)
      .then((table) => {
        cy.wrap(table).find(mui.tableElement).find(appFrontend.group.delete).click();
        cy.wrap(table)
          .find(mui.tableElement)
          .find(appFrontend.designSystemPanel)
          .find(appFrontend.group.popOverCancelButton)

          .click();
        cy.wrap(table).find(mui.tableElement).find(appFrontend.group.delete).click();
        cy.wrap(table)
          .find(mui.tableElement)
          .find(appFrontend.designSystemPanel)
          .find(appFrontend.group.popOverDeleteButton)

          .click();
      });
    cy.get(appFrontend.group.mainGroup).find(mui.tableElement).should('have.length', 0);
  });
});
