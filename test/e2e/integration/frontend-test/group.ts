import texts from 'test/e2e/fixtures/texts.json';
import { AppFrontend } from 'test/e2e/pageobjects/app-frontend';
import { Common } from 'test/e2e/pageobjects/common';

import type { CompExternal } from 'src/layout/layout';

const appFrontend = new AppFrontend();
const mui = new Common();

describe('Group', () => {
  const init = () => {
    cy.goto('group');
    cy.findByRole('button', { name: /Neste/ }).click();
    cy.get(appFrontend.group.showGroupToContinue).should('be.visible');
  };

  it('Should work without table headers', () => {
    cy.interceptLayout('group', (component) => {
      if (component.type === 'RepeatingGroup') {
        component.tableHeaders = [];
      }
    });

    init();
    cy.get(appFrontend.group.addNewItem).should('not.exist');
    cy.get(appFrontend.group.showGroupToContinue).findByRole('checkbox', { name: 'Ja' }).check();
    cy.get(appFrontend.group.addNewItem).click();

    // Make sure group is still visible even without table headers
    cy.get(appFrontend.group.currentValue).should('be.visible');
  });

  [true, false].forEach((alwaysShowAddButton) => {
    it(`Add items on main group when AlwaysShowAddButton = ${alwaysShowAddButton}`, () => {
      cy.interceptLayout('group', (c) => {
        if (c.type === 'RepeatingGroup' && c.edit && c.id === 'mainGroup') {
          c.edit.alwaysShowAddButton = alwaysShowAddButton;
          c.maxCount = 2;
        }
      });
      init();
      cy.get(appFrontend.group.showGroupToContinue).findByRole('checkbox', { name: 'Ja' }).check();
      if (alwaysShowAddButton) {
        cy.get(appFrontend.group.addNewItem).click();
        cy.get(appFrontend.group.mainGroup).should('exist');
        cy.get(appFrontend.group.addNewItem).click();
        cy.get(appFrontend.group.mainGroup).should('exist');
        cy.get(appFrontend.group.addNewItem).should('not.exist'); // Max rows reached
        cy.get(appFrontend.group.saveMainGroup).click();
        cy.get(appFrontend.group.mainGroup).find('tbody > tr').should('have.length', 2);
        cy.get(appFrontend.group.addNewItem).should('not.exist');
      } else {
        cy.get(appFrontend.group.addNewItem).click();
        cy.get(appFrontend.group.mainGroup).should('exist');
        cy.get(appFrontend.group.addNewItem).should('not.exist');
      }
    });
  });

  [true, false].forEach((openByDefault) => {
    it(`Add and delete items on main and nested group (openByDefault = ${openByDefault ? 'true' : 'false'})`, () => {
      cy.interceptLayout('group', (c) => {
        if (c.type === 'RepeatingGroup' && c.edit) {
          c.edit.openByDefault = openByDefault;
        }
      });
      init();

      cy.get(appFrontend.group.showGroupToContinue).findByRole('checkbox', { name: 'Ja' }).check();
      cy.addItemToGroup(1, 2, 'automation', openByDefault);
      cy.get(appFrontend.group.mainGroup).find('tbody > tr > td').first().should('have.text', 'NOK 1');
      cy.get(appFrontend.group.mainGroup).find('tbody > tr > td').eq(1).should('have.text', 'NOK 2');
      cy.findByRole('button', { name: 'Rediger NOK 1' }).click();
      cy.get(appFrontend.group.mainGroup).find(appFrontend.group.editContainer).find(appFrontend.group.next).click();
      cy.get(appFrontend.group.subGroup).find('td').first().invoke('text').should('equal', 'automation');
      cy.findByRole('button', { name: 'Rediger automation' }).click();
      cy.findByRole('button', { name: 'Slett-automation' }).click();

      // This test used to make sure deleted rows were re-added automatically, but that is no longer the case.
      cy.get(appFrontend.group.subGroup).find(mui.tableElement).should('have.length', 0);
      cy.get(appFrontend.group.addNewItemSubGroup).should('be.visible');
      cy.get(appFrontend.group.comments).should('not.exist');

      cy.get(appFrontend.group.mainGroup).find(appFrontend.group.editContainer).find(appFrontend.group.back).click();
      cy.findByRole('button', { name: 'Slett-NOK 1' }).click();

      cy.get(appFrontend.group.mainGroup).find(mui.tableElement).should('have.length', 0);
      cy.get(appFrontend.group.saveMainGroup).should('not.exist');
      cy.get(appFrontend.group.addNewItem).should('have.length', 1);
    });
  });

  it('Should not be possible to add more rows than maxCount', () => {
    cy.interceptLayout('group', (c) => {
      if (c.type === 'RepeatingGroup' && c.edit && c.id === 'mainGroup') {
        c.maxCount = 2;
      }
    });
    init();
    cy.get(appFrontend.group.showGroupToContinue).findByRole('checkbox', { name: 'Ja' }).check();
    cy.addItemToGroup(1, 1, 'automation');
    cy.get(appFrontend.group.addNewItem).should('exist');
    cy.addItemToGroup(2, 2, 'automation');
    cy.get(appFrontend.group.addNewItem).should('not.exist');
  });

  it('MaxCount exceeded hides add button when alwaysShowAddButton is true', () => {
    cy.interceptLayout('group', (c) => {
      if (c.type === 'RepeatingGroup' && c.edit && c.id === 'mainGroup') {
        c.maxCount = 2;
        c.edit.alwaysShowAddButton = true;
      }
    });
    init();
    cy.get(appFrontend.group.showGroupToContinue).findByRole('checkbox', { name: 'Ja' }).check();
    cy.addItemToGroup(11, 12, 'automation');
    cy.get(appFrontend.group.addNewItem).should('exist');
    cy.addItemToGroup(21, 22, 'automation');
    cy.get(appFrontend.group.addNewItem).should('not.exist');
  });

  it('Calculation on Item in Main Group should update value', () => {
    init();
    cy.get(appFrontend.group.showGroupToContinue).findByRole('checkbox', { name: 'Ja' }).check();
    cy.get(appFrontend.group.addNewItem).click();
    cy.get(appFrontend.group.currentValue).type('1337');
    // DataProcessingHandler.cs for frontend-test changes 1337 to 1338.
    cy.get(appFrontend.group.currentValue).should('have.value', 'NOK 1 338');
    cy.get(appFrontend.group.newValueLabel).should('contain.text', 'Endre verdi 1338 til');
  });

  it('Validation on group', () => {
    init();
    cy.get(appFrontend.group.showGroupToContinue).findByRole('checkbox', { name: 'Ja' }).check();
    cy.get(appFrontend.group.addNewItem).click();
    cy.get(appFrontend.group.currentValue).type('1');
    cy.get(appFrontend.group.newValue).type('0');
    cy.get(appFrontend.fieldValidation('newValue-0')).should('have.text', texts.zeroIsNotValid);
    cy.snapshot('group:validation');
    cy.get(appFrontend.group.newValue).clear();
    cy.get(appFrontend.group.newValue).type('1');
    cy.get(appFrontend.fieldValidation('newValue-0')).should('not.exist');
    cy.get(appFrontend.fieldValidation('mainGroup')).should('not.exist');
    cy.get(appFrontend.group.mainGroup).find(appFrontend.group.editContainer).find(appFrontend.group.next).click();
    cy.get(appFrontend.group.addNewItem).should('not.exist');
    cy.get(appFrontend.group.comments).type('test');
    cy.get(appFrontend.group.comments).blur();
    cy.get(appFrontend.fieldValidation('comments-0-0')).should('have.text', texts.testIsNotValidValue);
    cy.get(appFrontend.group.comments).clear();
    cy.get(appFrontend.group.comments).type('automation');
    cy.get(appFrontend.fieldValidation('comments-0-0')).should('not.exist');
    cy.get(appFrontend.fieldValidation('subGroup-0')).should('not.exist');
    cy.get(appFrontend.fieldValidation('mainGroup')).should('not.exist');
    cy.get(appFrontend.group.saveSubGroup).clickAndGone();
    cy.get(appFrontend.group.saveMainGroup).clickAndGone();
  });

  it('Validation on repeating group for minCount', () => {
    // set minCount to 3 on main group
    cy.interceptLayout('group', (c) => {
      if (c.type === 'RepeatingGroup' && c.edit && c.id === 'mainGroup') {
        c.minCount = 3;
      }
    });

    init();
    cy.get(appFrontend.group.showGroupToContinue).findByRole('checkbox', { name: 'Ja' }).check();

    cy.get(appFrontend.group.mainGroup).should('be.visible');
    cy.get(appFrontend.fieldValidation('mainGroup')).should('not.exist');

    const rowsToAdd = [1, 2, 3];
    for (const idx in rowsToAdd) {
      cy.get(appFrontend.group.addNewItem).click();
      cy.get(appFrontend.group.currentValue).type(`${rowsToAdd[idx]}`);
      cy.get(appFrontend.group.newValue).type(`${rowsToAdd[idx]}`);
      cy.get(appFrontend.group.saveMainGroup).clickAndGone();

      if (parseInt(idx) < rowsToAdd.length - 1) {
        cy.findByRole('button', { name: /Neste/ }).click();
        cy.get(appFrontend.fieldValidation('mainGroup')).should('have.text', texts.minCountError);
      } else {
        cy.get(appFrontend.fieldValidation('mainGroup')).should('not.exist');
      }
    }

    cy.get(appFrontend.group.mainGroup).findByRole('button', { name: 'Slett-NOK 1' }).first().click();
    cy.findByRole('button', { name: /Neste/ }).click();
    cy.get(appFrontend.fieldValidation('mainGroup')).should('have.text', texts.minCountError);
  });

  it('Validates group on row save', () => {
    const layoutMutator = (component: CompExternal) => {
      // Remove component triggers and set required
      if (['currentValue', 'newValue'].includes(component.id) && component.type === 'Input') {
        component.showValidations = [];
        component.required = true;
      }
    };
    cy.interceptLayout('group', layoutMutator);

    init();

    cy.get(appFrontend.group.showGroupToContinue).findByRole('checkbox', { name: 'Ja' }).check();

    // Filling out everything works fine
    cy.get(appFrontend.group.addNewItem).click();
    cy.get(appFrontend.group.currentValue).type('123');
    cy.get(appFrontend.group.newValue).type('1');
    cy.get(appFrontend.group.saveMainGroup).clickAndGone();

    // Forgetting the second field triggers validation
    cy.get(appFrontend.group.addNewItem).click();
    cy.get(appFrontend.group.currentValue).type('456');
    cy.get(appFrontend.group.saveMainGroup).click();
    cy.get(appFrontend.fieldValidation('newValue-1')).should('have.text', texts.requiredFieldToValue456);
    cy.get(appFrontend.errorReport).should('contain.text', texts.requiredFieldToValue456);
    cy.get(appFrontend.group.newValue).type('1');
    cy.get(appFrontend.group.saveMainGroup).clickAndGone();

    // Forgetting the first field triggers validation
    cy.get(appFrontend.group.addNewItem).click();
    cy.get(appFrontend.group.newValue).type('789');
    cy.get(appFrontend.group.saveMainGroup).click();

    cy.get(appFrontend.errorReport)
      .should('contain.text', texts.requiredFieldFromValue)
      .should('not.contain.text', texts.requiredFieldToValue);
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
            cy.wrap(table).find('tr').eq(index).find('td').first().should('contain.text', row[0]);
            cy.wrap(table).find('tr').eq(index).find('td').eq(1).should('contain.text', row[1]);
            index++;
          }
        });
    };

    cy.get(appFrontend.group.showGroupToContinue).findByRole('checkbox', { name: 'Ja' }).check();
    expectRows();

    function checkPrefills(items: { [key in keyof typeof appFrontend.group.prefill]?: boolean }) {
      cy.findByRole('button', { name: 'Forrige' }).click();
      for (const item of Object.keys(items)) {
        if (items[item] === true) {
          cy.findByRole('checkbox', { name: appFrontend.group.prefill[item] }).check();
        } else {
          cy.findByRole('checkbox', { name: appFrontend.group.prefill[item] }).uncheck();
        }
      }
      cy.findByRole('button', { name: /Neste/ }).click();
    }

    checkPrefills({ liten: true });
    expectRows(['NOK 1', 'NOK 5']);

    checkPrefills({ middels: true, svaer: true });
    expectRows(['NOK 1', 'NOK 5'], ['NOK 120', 'NOK 350'], ['NOK 80 323', 'NOK 123 455']);
    cy.snapshot('group:prefill');

    checkPrefills({ middels: false, svaer: false });
    expectRows(['NOK 1', 'NOK 5']);

    checkPrefills({ enorm: true, liten: false });
    expectRows(['NOK 9 872 345', 'NOK 18 872 345']);

    checkPrefills({ liten: true });
    expectRows(['NOK 9 872 345', 'NOK 18 872 345'], ['NOK 1', 'NOK 5']);

    cy.findByRole('button', { name: 'Se innhold NOK 9 872 345' }).click();
    cy.findByRole('button', { name: 'Lukk NOK 9 872 345' }).should('exist');
    cy.get(appFrontend.group.saveMainGroup).should('have.text', 'Lukk');
    cy.get(appFrontend.group.saveMainGroup).clickAndGone();

    // The 'liten' row differs, as it should not have a save button on the bottom
    cy.findByRole('button', { name: 'Se innhold NOK 1' }).click();
    cy.findByRole('button', { name: 'Lukk NOK 1' }).should('exist');
    cy.get(appFrontend.group.saveMainGroup).should('not.exist');
  });

  it('Delete group row after validation', () => {
    cy.interceptLayout('group', (component) => {
      if (['currentValue', 'newValue'].includes(component.id) && component.type === 'Input') {
        // Sets these two components to required
        component.required = true;
      }
    });
    init();

    cy.get(appFrontend.group.showGroupToContinue).findByRole('checkbox', { name: 'Ja' }).check();
    cy.get(appFrontend.group.addNewItem).click();

    cy.get(appFrontend.group.saveMainGroup).click();

    cy.get(appFrontend.fieldValidation('currentValue-0')).should('have.text', texts.requiredFieldFromValue);

    cy.findByRole('textbox', { name: '1. Endre fra' }).type('123');
    cy.get(appFrontend.group.saveMainGroup).click();

    cy.get(appFrontend.fieldValidation('newValue-0')).should('have.text', texts.requiredFieldToValue);

    cy.get(appFrontend.group.mainGroup)
      .find(mui.tableBody)
      .then((table) => {
        cy.wrap(table).findByRole('button', { name: 'Slett-NOK 123' }).click();
      });

    cy.gotoNavPage('hide');
    cy.get(appFrontend.group.sendersName).should('exist');
  });

  it("Open by default on prefilled group (openByDefault = ['first', 'last', true, false])", () => {
    init();

    cy.get(appFrontend.group.showGroupToContinue).findByRole('checkbox', { name: 'Ja' }).check();
    cy.get(appFrontend.group.addNewItem).should('be.visible');

    // Order is important here. True must be first, as it only opens the row for editing if there are no rows already,
    // whereas 'first' and 'last' will always open the existing row.
    // False must always be last here, so that we are allowed to delete the stray row before proceeding in the test,
    // as any other setting would just re-create it again.
    [true, 'first' as const, 'last' as const, false].forEach((openByDefault) => {
      cy.interceptLayout('group', (c) => {
        if (c.type === 'RepeatingGroup' && c.edit) {
          c.edit.openByDefault = openByDefault;
        }
      });

      cy.log('Testing whether new empty group is opened when openByDefault =', openByDefault);
      cy.reloadAndWait();

      if (openByDefault) {
        cy.get(appFrontend.group.mainGroupTableBody).children().should('have.length', 2);
        cy.get(appFrontend.group.mainGroupTableBody)
          .children()
          .eq(1)
          .find(appFrontend.group.saveMainGroup)
          .should('exist')
          .and('be.visible');

        // Should be able to close the group for editing even if it was opened by default
        cy.get(appFrontend.group.saveMainGroup).clickAndGone();
        cy.get(appFrontend.group.mainGroupTableBody).children().should('have.length', 1);
      } else {
        cy.get(appFrontend.group.mainGroupTableBody).find(appFrontend.group.saveMainGroup).should('not.exist');
      }
    });

    // Delete the stray row, wait until we've saved it
    cy.findByRole('button', { name: 'Slett-undefined' }).click();
    cy.get(appFrontend.group.mainGroupTableBody).children().should('have.length', 0);

    cy.interceptLayout('group', (c) => {
      if (c.type === 'RepeatingGroup' && c.edit) {
        c.edit.openByDefault = c.id === 'subGroup';
      }
    });
    cy.reloadAndWait();

    cy.addItemToGroup(1, 2, 'item 1');
    cy.addItemToGroup(20, 30, 'item 2');
    cy.addItemToGroup(400, 600, 'item 3');

    ['first' as const, 'last' as const, true, false].forEach((openByDefault) => {
      cy.changeLayout((c) => {
        if (c.type === 'RepeatingGroup' && c.edit && c.edit.openByDefault !== undefined) {
          c.edit.openByDefault = openByDefault;
        }
      });
      cy.gotoNavPage('repeating');

      cy.log('Testing whether whether existing item is opened when openByDefault =', openByDefault);

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
      } else {
        cy.get(appFrontend.group.mainGroupTableBody).children().should('have.length', 3);
        cy.get(appFrontend.group.mainGroupTableBody).find(appFrontend.group.saveMainGroup).should('not.exist');
      }
    });

    cy.changeLayout((c) => {
      if (c.type === 'RepeatingGroup' && c.edit && c.edit.openByDefault !== undefined) {
        c.edit.openByDefault = true;
      }
    });
    cy.gotoNavPage('repeating');

    // Test that deleting an item does not cause another group to open if there are more elements in the group
    cy.get(appFrontend.group.mainGroupTableBody).children().eq(0).findByRole('button', { name: 'Slett-NOK 1' }).click();
    cy.get(appFrontend.group.mainGroupTableBody).find(appFrontend.group.saveMainGroup).should('not.exist');
  });

  it('Opens delete warning popup when alertOnDelete is true and deletes on confirm', () => {
    cy.interceptLayout('group', (c) => {
      if (c.type === 'RepeatingGroup' && c.edit && typeof c.edit.openByDefault !== 'undefined') {
        c.edit.alertOnDelete = true;
      }
    });
    init();

    // Add test-data and verify
    cy.get(appFrontend.group.showGroupToContinue).findByRole('checkbox', { name: 'Ja' }).check();
    cy.addItemToGroup(1, 2, 'automation');
    cy.get(appFrontend.group.mainGroup).find('tbody > tr > td').first().should('have.text', 'NOK 1');
    cy.get(appFrontend.group.mainGroup).find('tbody > tr > td').eq(1).should('have.text', 'NOK 2');
    cy.findByRole('button', { name: 'Rediger NOK 1' }).click();

    // Navigate to nested group and test delete warning popoup cancel and confirm
    cy.get(appFrontend.group.mainGroup).find(appFrontend.group.editContainer).find(appFrontend.group.next).click();

    cy.get(appFrontend.group.subGroup).find('tbody > tr > td').first().should('have.text', 'automation');
    cy.get(appFrontend.group.subGroup).findByRole('button', { name: 'Slett-automation' }).click();

    cy.findByRole('button', { name: 'Avbryt' }).click({ force: true });
    cy.get(appFrontend.group.subGroup).findByRole('button', { name: 'Slett-automation' }).click();
    cy.findByRole('button', { name: /Ja, slett raden/ }).click({ force: true });

    cy.get(appFrontend.group.subGroup).find('tbody > tr > td').should('have.length', 0);

    // Navigate to main group and test delete warning popup cancel and confirm
    cy.get(appFrontend.group.mainGroup).find(appFrontend.group.editContainer).find(appFrontend.group.back).click();
    cy.get(appFrontend.group.mainGroup).findByRole('button', { name: 'Slett-NOK 1' }).click();
    cy.findByRole('button', { name: 'Avbryt' }).click();
    cy.get(appFrontend.group.mainGroup).findByRole('button', { name: 'Slett-NOK 1' }).click();
    cy.findByRole('button', { name: /Ja, slett raden/ }).click();

    cy.get(appFrontend.group.mainGroup).find(mui.tableElement).should('have.length', 0);
  });

  it('should be able to edit components directly in the table', () => {
    cy.goto('group');
    cy.navPage('prefill').should('be.visible');
    cy.changeLayout((c) => {
      if (c.type === 'RepeatingGroup' && c.tableColumns && c.edit && c.id === 'mainGroup') {
        c.tableColumns['currentValue'].editInTable = true;
        c.tableColumns['newValue'].editInTable = true;
        c.edit.editButton = false;
      }
    });

    cy.gotoNavPage('prefill');
    cy.findByRole('checkbox', { name: appFrontend.group.prefill.liten }).check();
    cy.findByRole('checkbox', { name: appFrontend.group.prefill.middels }).check();
    cy.findByRole('checkbox', { name: appFrontend.group.prefill.enorm }).check();
    cy.gotoNavPage('repeating');
    cy.get(appFrontend.group.showGroupToContinue).findByRole('checkbox', { name: 'Ja' }).check();
    cy.get(appFrontend.group.mainGroupTableBody).find('tr').should('have.length', 3);
    cy.snapshot('group:edit-in-table');

    for (const row of [0, 1, 2]) {
      cy.get(appFrontend.group.mainGroupTableBody)
        .find('tr')
        .eq(row)
        .find(appFrontend.group.currentValue)
        .should('be.visible')
        .should('have.attr', 'readonly', 'readonly')
        .should('have.attr', 'id', `currentValue-${row}`);
      cy.get(appFrontend.group.mainGroupTableBody)
        .find('tr')
        .eq(row)
        .find(appFrontend.group.newValue)
        .should('be.visible')
        .should('have.attr', 'readonly', 'readonly')
        .should('have.attr', 'id', `newValue-${row}`);
    }

    cy.get(appFrontend.group.mainGroupTableBody).find('tr').eq(3).should('not.exist');

    cy.changeLayout((c) => {
      if (c.type === 'RepeatingGroup' && c.tableColumns && c.edit && c.id === 'mainGroup') {
        // We need to show this button to make sure the edit container shows up. The edit container will never show up
        // if the table row is not editable.
        c.edit.editButton = true;
      }
    });

    cy.get(appFrontend.group.addNewItem).click();

    cy.get(appFrontend.group.mainGroupTableBody).find('tr').should('have.length', 5);
    cy.get(appFrontend.group.mainGroupTableBody).find('tr').eq(3).find(appFrontend.group.currentValue).type('123');
    cy.get(appFrontend.group.mainGroupTableBody).find('tr').eq(3).find(appFrontend.group.newValue).type('456');

    cy.get(appFrontend.group.editContainer).find(appFrontend.group.currentValue).should('have.value', 'NOK 123');
    cy.get(appFrontend.group.editContainer).find(appFrontend.group.newValue).should('have.value', 'NOK 456');

    // This does not exist later, when we enter 'onlyTable' mode
    cy.get(appFrontend.group.saveMainGroup).click();

    cy.findAllByRole('button', { name: /Slett/ }).should('have.length', 1);
    cy.waitUntilSaved();
    cy.findByRole('button', { name: 'Slett-NOK 123' }).click();
    cy.get(appFrontend.group.mainGroupTableBody).find('tr').should('have.length', 3);

    cy.changeLayout((c) => {
      if (c.type === 'RepeatingGroup' && c.tableColumns && c.edit && c.id === 'mainGroup') {
        c.tableColumns['currentValue'].showInExpandedEdit = false;
        c.tableColumns['newValue'].showInExpandedEdit = false;
      }
    });

    cy.get(appFrontend.group.addNewItem).click();
    cy.get(appFrontend.group.mainGroupTableBody).find('tr').should('have.length', 5);
    cy.get(appFrontend.group.mainGroupTableBody).find('tr').eq(3).find(appFrontend.group.currentValue).type('789');
    cy.get(appFrontend.group.mainGroupTableBody).find('tr').eq(3).find(appFrontend.group.newValue).type('987');

    cy.get(appFrontend.group.editContainer).find(appFrontend.group.currentValue).should('not.exist');
    cy.get(appFrontend.group.editContainer).find(appFrontend.group.newValue).should('not.exist');
    cy.get(appFrontend.group.saveMainGroup).clickAndGone();

    cy.changeLayout((c) => {
      if (c.type === 'RepeatingGroup' && c.tableColumns && c.edit && c.id === 'mainGroup') {
        c.edit.mode = 'onlyTable';

        // This has no effect, as the edit button is always hidden when editing always is done in table. Still, we
        // set it to false to make sure that functionality works as intended without setting this to false.
        c.edit.editButton = true;

        // This also should not have any effect, but since we are in 'onlyTable' mode, the add button should always
        // be visible anyway. That's because when we add a new row, we never enter 'edit mode', because the row is
        // just present in the table, ready for editing.
        c.edit.alwaysShowAddButton = false;
      }
    });

    // Reset state by going back and forth
    cy.gotoNavPage('prefill');
    cy.gotoNavPage('repeating');

    cy.get(appFrontend.group.addNewItem).click();
    cy.get(appFrontend.group.editContainer).should('not.exist');
    cy.get(appFrontend.group.mainGroupTableBody).find('tr').should('have.length', 5);
    cy.snapshot('group:only-table');

    for (const extraRows of [6, 7]) {
      cy.get(appFrontend.group.addNewItem).click();
      cy.get(appFrontend.group.mainGroupTableBody).find('tr').should('have.length', extraRows);
    }

    // Typing into the second to last row
    cy.get(appFrontend.group.mainGroupTableBody).find('tr').eq(5).find(appFrontend.group.currentValue).type('1');
    cy.get(appFrontend.group.mainGroupTableBody).find('tr').eq(5).find(appFrontend.group.newValue).type('2');

    // This should not change the maximum number of rows
    cy.get(appFrontend.group.mainGroupTableBody).find('tr').should('have.length', 7);
  });

  it('should be able to customize the add button in repeating groups', () => {
    cy.goto('group');
    cy.findByRole('button', { name: /Neste/ }).click();
    cy.changeLayout((c) => {
      if (c.type === 'RepeatingGroup' && c.id === 'mainGroup' && c.textResourceBindings) {
        c.textResourceBindings.add_button_full = 'Hello World';
      }
    });
    cy.get(appFrontend.group.showGroupToContinue).findByRole('checkbox', { name: 'Ja' }).check();
    cy.get(appFrontend.group.addNewItem).should('have.text', 'Hello World');
  });

  it('should be possible to set text resource bindings to empty string to use default values', () => {
    cy.interceptLayout('group', (c) => {
      if (c.type === 'RepeatingGroup' && c.id === 'mainGroup' && c.textResourceBindings && c.edit) {
        // A bit special for repeating groups and these text resource bindings: They should use the default texts when
        // set to empty strings, so as to make it easy to default to conditionally set the text so something else, but
        // still be able to fall back to the default texts. This is usually not expected behavior for other components.
        c.textResourceBindings.save_and_next_button = 'next-btn-text';
        c.textResourceBindings.save_button = '';
        c.textResourceBindings.edit_button_open = '';
        c.textResourceBindings.edit_button_close = '';
        c.edit.saveAndNextButton = true;
      }
      if (c.id === 'currentValue' && c.type === 'Input' && c.textResourceBindings) {
        c.textResourceBindings.tableTitle = 'currentValue tableTitle';
      }
      if (c.id === 'newValue' && c.type === 'Input' && c.textResourceBindings) {
        c.textResourceBindings.tableTitle = '';
        c.textResourceBindings.title = 'newValue title';
      }
    });

    cy.goto('group');
    cy.findByRole('checkbox', { name: appFrontend.group.prefill.liten }).check();
    cy.findByRole('checkbox', { name: appFrontend.group.prefill.middels }).check();
    cy.findByRole('checkbox', { name: appFrontend.group.prefill.enorm }).check();
    cy.gotoNavPage('repeating');
    cy.get(appFrontend.group.showGroupToContinue).findByRole('checkbox', { name: 'Ja' }).check();

    // Make sure the new row is added last, and that the last few things we did has been saved
    // (and thus that the new rows have been received from the backend)
    cy.waitUntilSaved();
    cy.get(appFrontend.group.addNewItem).click();

    cy.get('#group-mainGroup table th').eq(0).should('have.text', 'currentValue tableTitle');
    cy.get('#group-mainGroup table th').eq(1).should('have.text', 'newValue title');

    const getRows = () => cy.get(appFrontend.group.mainGroupTableBody).find('tr');
    getRows().eq(0).find('td').last().should('contain.text', 'Rediger');
    getRows().eq(3).find('td').eq(4).should('contain.text', 'Lagre og lukk');
    getRows().eq(3).find('td').eq(5).should('contain.text', 'Slett');

    cy.get(appFrontend.group.editContainer).findAllByRole('button').last().should('have.text', 'Lagre og lukk');
    cy.get(appFrontend.group.saveMainGroup).clickAndGone();
    cy.get(appFrontend.group.editContainer).should('not.exist');
    cy.get(appFrontend.group.addNewItem).clickAndGone();
    cy.findAllByRole('button', { name: /Rediger/ })
      .eq(3)
      .click();
    cy.get(appFrontend.group.editContainer).findAllByRole('button').eq(1).should('have.text', 'next-btn-text');

    cy.changeLayout((c) => {
      if (c.type === 'RepeatingGroup' && c.id === 'mainGroup' && c.textResourceBindings) {
        c.textResourceBindings.save_and_next_button = '';
      }
    });
    cy.findAllByRole('button', { name: /Rediger/ })
      .eq(3)
      .click();
    cy.get(appFrontend.group.editContainer).findAllByRole('button').eq(1).should('have.text', 'Lagre og åpne neste');
    cy.get(appFrontend.group.editContainer).findAllByRole('button').eq(2).should('have.text', 'Lagre og lukk');
  });

  it('adding group rows should trigger backend calculations + selecting options from source', () => {
    cy.goto('group');

    cy.findByRole('checkbox', { name: appFrontend.group.prefill.liten }).check();
    cy.findByRole('checkbox', { name: appFrontend.group.prefill.middels }).check();

    cy.gotoNavPage('repeating');
    cy.get(appFrontend.group.showGroupToContinue).findByRole('checkbox', { name: 'Ja' }).check();

    const selectedOption = 'Endre fra: 120, Endre til: 350';
    const longSelectedText = `${selectedOption} Fungerer kalkulatoren din?`;

    // First make sure to check the second item in the bottom-most radio group. This should also change the items
    // in the two dropdowns above.
    cy.get('#reduxOptions-expressions-radiobuttons').findByRole('radio', { name: longSelectedText }).click();
    cy.get('[data-componentid="reduxOptions-expressions"] input').should(
      'have.value',
      `${selectedOption} Gjør du leksene dine?`,
    );
    cy.get('[data-componentid="reduxOptions"] input').should('have.value', selectedOption);

    cy.get(appFrontend.group.secondGroup_add).click();
    cy.get('#group2-teller-0').should('have.value', '1');
    cy.dsSelect('#group2-input-0', 'Endre fra: 1, Endre til: 5');

    cy.get(appFrontend.group.secondGroup).findByRole('button', { name: 'Lagre og lukk' }).clickAndGone();
    cy.get(appFrontend.group.secondGroup_add).click();
    cy.get('#group2-teller-1').should('have.value', '2');
    cy.dsSelect('#group2-input-1', 'Endre fra: 120, Endre til: 350');
    cy.get(appFrontend.group.secondGroup).findByRole('button', { name: 'Lagre og lukk' }).clickAndGone();

    cy.get(appFrontend.group.secondGroup).find('tbody > tr').should('have.length', 2);
    cy.get(appFrontend.group.secondGroup).find('tbody > tr').eq(0).should('contain.text', 'Endre fra: 1, Endre til: 5');
    cy.get(appFrontend.group.secondGroup)
      .find('tbody > tr')
      .eq(1)
      .should('contain.text', 'Endre fra: 120, Endre til: 350');

    cy.waitUntilSaved(); // Wait until saved so that we're sure the previous changes are synced before we try to delete
    cy.get(appFrontend.group.secondGroup).findByRole('button', { name: 'Slett-1' }).click();
    cy.get(appFrontend.group.secondGroup).find('tbody > tr').should('have.length', 1);

    cy.get(appFrontend.group.secondGroup_add).click();
    cy.get('#group2-teller-1').should('have.value', '3');
    cy.dsSelect('#group2-input-1', 'Endre fra: 1, Endre til: 5');
    cy.get(appFrontend.group.secondGroup).findByRole('button', { name: 'Lagre og lukk' }).clickAndGone();

    cy.get(appFrontend.group.secondGroup).find('tbody > tr').should('have.length', 2);
    cy.get(appFrontend.group.secondGroup)
      .find('tbody > tr')
      .eq(0)
      .should('contain.text', 'Endre fra: 120, Endre til: 350');
    cy.get(appFrontend.group.secondGroup).find('tbody > tr').eq(1).should('contain.text', 'Endre fra: 1, Endre til: 5');
    cy.waitUntilSaved();

    // Adding a new row to the main group adds a new option
    cy.gotoNavPage('prefill');
    cy.findByRole('checkbox', { name: appFrontend.group.prefill.stor }).check();
    cy.gotoNavPage('repeating');

    cy.get(appFrontend.group.secondGroup).find('tbody > tr').should('have.length', 2);
    cy.get(appFrontend.group.secondGroup)
      .find('tbody > tr')
      .eq(0)
      .should('contain.text', 'Endre fra: 120, Endre til: 350');
    cy.get(appFrontend.group.secondGroup).find('tbody > tr').eq(1).should('contain.text', 'Endre fra: 1, Endre til: 5');

    // Also make sure the options we selected at first are still selected
    cy.get('#reduxOptions-expressions-radiobuttons')
      .findByRole('radio', { name: longSelectedText })
      .should('be.checked');
    cy.get('[data-componentid="reduxOptions-expressions"] input').should(
      'have.value',
      `${selectedOption} Gjør du leksene dine?`,
    );
    cy.get('[data-componentid="reduxOptions"] input').should('have.value', selectedOption);

    // Now, find the row with number '3' in it, open it for editing, and then delete it while it's open
    cy.get(appFrontend.group.secondGroup).find('tbody > tr').eq(1).find('td').first().should('contain.text', '3');
    cy.get(appFrontend.group.secondGroup).find('tbody > tr').eq(1).findByRole('button', { name: 'Rediger 3' }).click();

    // The add new row button should no longer exist now
    cy.get(appFrontend.group.secondGroup_add).should('not.exist');

    cy.get(appFrontend.group.secondGroup).find('tbody > tr').eq(1).findByRole('button', { name: 'Slett-3' }).click();

    // But now the button should exist again, and be clickable. The new row should have id 4.
    cy.get(appFrontend.group.secondGroup_add).click();
    cy.get('#group2-teller-1').should('have.value', '4');
  });

  it('openByDefault = first should work even if the first row is hidden', () => {
    cy.interceptLayout('group', (c) => {
      if (c.type === 'RepeatingGroup' && c.id === 'mainGroup' && c.edit) {
        c.edit.openByDefault = 'first';
      }
    });

    cy.goto('group');

    for (const prefill of [
      appFrontend.group.prefill.svaer,
      appFrontend.group.prefill.middels,
      appFrontend.group.prefill.liten,
    ]) {
      // It is very important that these gets checked in this order, as the rest of the test relies on that.
      // Order is not guaranteed here, so we'll wait for each one to be saved before continuing.
      cy.findByRole('checkbox', { name: prefill }).check();
      cy.waitUntilSaved();
    }

    cy.gotoNavPage('repeating');
    cy.get(appFrontend.group.showGroupToContinue).findByRole('checkbox', { name: 'Ja' }).check();
    cy.get(appFrontend.group.editContainer).find('input').first().should('have.value', 'NOK 80 323');

    cy.get(appFrontend.group.hideRepeatingGroupRow).numberFormatClear();
    cy.get(appFrontend.group.hideRepeatingGroupRow).type('1000');

    cy.get(appFrontend.group.editContainer).should('not.exist');

    // Navigating between pages should clear the state for which group row is editing, so now the
    // first one (that is not hidden) should be open
    cy.gotoNavPage('prefill');
    cy.findByRole('checkbox', { name: appFrontend.group.prefill.liten }).should('be.visible');
    cy.gotoNavPage('repeating');

    cy.get(appFrontend.group.editContainer).find('input').first().should('have.value', 'NOK 120');
  });

  it('should be possible do disable prefilling, and write to data model paths that are not in the layout', () => {
    cy.goto('group');

    // This should be checked by default. This tests that the data model definition on the backend can set a default
    // value using C# default values in the strict model.
    cy.get('#prefill-enabled').findByRole('radio', { name: 'Ja' }).should('be.checked');

    cy.findByRole('checkbox', { name: appFrontend.group.prefill.liten }).check();
    cy.gotoNavPage('repeating');
    cy.get(appFrontend.group.showGroupToContinue).findByRole('checkbox', { name: 'Ja' }).check();
    cy.get(appFrontend.group.mainGroupTableBody).find('tr').should('have.length', 1);
    cy.get(appFrontend.group.mainGroupTableBody).find('tr').eq(0).should('contain.text', 'NOK 1');

    cy.gotoNavPage('prefill');
    cy.get('#prefill-enabled').findByRole('radio', { name: 'Nei' }).click();
    cy.findByRole('checkbox', { name: appFrontend.group.prefill.middels }).check();
    cy.waitUntilSaved();

    cy.gotoNavPage('repeating');
    cy.get(appFrontend.group.mainGroupTableBody).find('tr').should('have.length', 1);
    cy.get(appFrontend.group.mainGroupTableBody).find('tr').eq(0).should('contain.text', 'NOK 1');

    cy.gotoNavPage('prefill');
    cy.get('#prefill-enabled').findByRole('radio', { name: 'Ja' }).click();
    cy.findByRole('checkbox', { name: appFrontend.group.prefill.stor }).check();

    // When we temporarily disabled the prefilling functionality, ruleHandler tricked the backend by
    // setting PrefillValuesShadow to the same value as PrefillValues, making the backend think the 'middels' row we
    // wanted was already present in the main repeating group. When we now re-enable prefilling, that value will
    // persist in PrefillValuesShadow, still making the backend think the 'middels' row exists - so it still won't
    // add it at this point.
    cy.gotoNavPage('repeating');
    cy.get(appFrontend.group.mainGroupTableBody).find('tr').should('have.length', 2);
    cy.get(appFrontend.group.mainGroupTableBody).find('tr').eq(0).should('contain.text', 'NOK 1');
    cy.get(appFrontend.group.mainGroupTableBody).find('tr').eq(1).should('contain.text', 'NOK 1 233');
  });

  it('Non-standard modes (showAll, hideTable, onlyTable), hidden rows, editing and label visibility', () => {
    cy.interceptLayout('group', (c) => {
      if (c.id === 'summary1' && c.type === 'Summary') {
        c.largeGroup = false;
      }
      if (c.id === 'mainGroup' && c.type === 'RepeatingGroup' && c.edit) {
        c.edit.mode = 'showAll';
      }
    });
    cy.goto('group');
    cy.findByRole('checkbox', { name: appFrontend.group.prefill.liten }).check();
    cy.findByRole('checkbox', { name: appFrontend.group.prefill.middels }).check();
    cy.findByRole('checkbox', { name: appFrontend.group.prefill.stor }).check();
    cy.findByRole('checkbox', { name: appFrontend.group.prefill.svaer }).check();
    cy.findByRole('checkbox', { name: appFrontend.group.prefill.enorm }).check();
    cy.gotoNavPage('repeating');
    cy.get(appFrontend.group.showGroupToContinue).findByRole('checkbox', { name: 'Ja' }).check();

    function hideAllRows() {
      // Make sure we don't have any rows open for editing before hiding them
      cy.get(appFrontend.group.saveMainGroup).should('not.exist');

      cy.get(appFrontend.group.hideRepeatingGroupRow).numberFormatClear();
      cy.get(appFrontend.group.hideRepeatingGroupRow).type('0');
    }

    function showSomeRows() {
      cy.get(appFrontend.group.hideRepeatingGroupRow).numberFormatClear();
      cy.get(appFrontend.group.hideRepeatingGroupRow).type('1000');
    }

    showSomeRows();

    // Testing that hidden rows are not shown in the summary
    cy.gotoNavPage('summary');
    cy.get('[data-testid="summary-repeating-row"]').should('have.length', 2);

    function assertGroupLabelAsFieldSet(insideGroup: string, rowLength: number, addButtonVisbible = true) {
      cy.findByRole('caption', { name: 'Group title' }).should('not.exist');
      cy.findByRole('table', { name: 'Group title' }).should('not.exist');
      cy.findByRole('group', { name: 'Group title' }).find(insideGroup).should('have.length', rowLength);
      if (addButtonVisbible) {
        cy.findByRole('group', { name: 'Group title' }).find(appFrontend.group.addNewItem).should('be.visible');
      } else {
        cy.get(appFrontend.group.addNewItem).should('not.exist');
      }
    }

    function assertGroupLabelAsCaption(numRows: number) {
      cy.findByRole('group', { name: 'Group title' }).should('not.exist');

      cy.findByRole('table', { name: 'Group title' })
        .find(appFrontend.group.mainGroupTableBody)
        .find('tr')
        .should('have.length', numRows);

      // The caption itself is a role inside the table, but it does not 'contain' the table rows themselves
      cy.findByRole('caption', { name: 'Group title' }).find(appFrontend.group.mainGroupTableBody).should('not.exist');

      // The caption and table roles does not cover the add button (maybe it should? the add button is not a part of the
      // table, but it is a part of the group component)
      cy.findByRole('caption', { name: 'Group title' }).find(appFrontend.group.addNewItem).should('not.exist');
      cy.findByRole('table', { name: 'Group title' }).find(appFrontend.group.addNewItem).should('not.exist');

      // But the button should be visible outside the table
      cy.get(appFrontend.group.addNewItem).should('be.visible');

      // No headers should be visible when there are no rows
      const numHeaders = numRows === 0 ? 0 : 1;
      cy.get(appFrontend.group.mainGroup)
        .find('tr')
        .should('have.length', numRows + numHeaders);
    }

    cy.gotoNavPage('repeating');
    const editContainers = '[id^="group-edit-container-mainGroup-"]';
    cy.get(editContainers).should('have.length', 2);

    // Assert that the label is a fieldset that covers all rows and the add button
    assertGroupLabelAsFieldSet(editContainers, 2);

    // Take a snapshot to make sure we don't get visual regressions for mode:showAll. Make sure we go to the next
    // page in one of the rows in order to also snapshot the Cards component inside a repeating group edit container.
    cy.get(editContainers).eq(1).findByRole('button', { name: 'Neste' }).click();
    cy.get(editContainers).eq(1).should('contain.text', 'Hvem tipset deg om dette skjemaet?');
    cy.snapshot('group:showAll');

    // Verify that the label and add button still shows up when there are no rows in this mode
    hideAllRows();
    cy.get(editContainers).should('not.exist');
    cy.get(appFrontend.group.mainGroupTableBody).should('not.exist');
    assertGroupLabelAsFieldSet(editContainers, 0);

    cy.changeLayout((c) => {
      if (c.id === 'mainGroup' && c.type === 'RepeatingGroup' && c.edit) {
        c.edit.mode = 'hideTable';
      }
    });

    // In the hideTable mode, the table should be visible except when any row is being edited.
    showSomeRows();
    cy.get(appFrontend.group.mainGroupTableBody).find('tr').should('have.length', 2);
    cy.get(appFrontend.group.editContainer).should('not.exist');

    // When showing a table, the label is a caption inside that table
    assertGroupLabelAsCaption(2);

    // Opening a row for editing should hide the table
    cy.get(appFrontend.group.mainGroupTableBody)
      .find('tr')
      .eq(0)
      .findByRole('button', { name: 'Se innhold NOK 1' })
      .click();
    cy.get(appFrontend.group.mainGroupTableBody).should('not.exist');
    cy.get(appFrontend.group.editContainer).should('be.visible');
    assertGroupLabelAsFieldSet(editContainers, 1, false); // No AddButton in this mode unless you close for editing
    cy.get(appFrontend.group.saveMainGroup).clickAndGone();

    hideAllRows();

    // When all the rows are hidden, the label and add button should still show up in the hideTable mode, but
    // the table should not be visible
    assertGroupLabelAsCaption(0);

    cy.changeLayout((c) => {
      if (c.id === 'mainGroup' && c.type === 'RepeatingGroup' && c.edit) {
        c.edit.mode = 'onlyTable';
      }
    });

    // In the onlyTable mode, the table should be visible, and the edit container should not be visible
    showSomeRows();
    cy.get(appFrontend.group.mainGroupTableBody).find('tr').should('have.length', 2);
    assertGroupLabelAsCaption(2);
    cy.findByRole('button', { name: /Rediger/ }).should('not.exist');

    hideAllRows();
    assertGroupLabelAsCaption(0);
  });

  it('Adding new nodes while nodes are already being generated', () => {
    // When rewriting the nodes generator, this would reliably fail. That happened because the node generation process
    // starts as soon as the data is saved, and when you at that point immediately click a new checkbox, that triggers
    // a new node generation process - before the first one has finished.
    cy.goto('group');
    cy.findByRole('checkbox', { name: appFrontend.group.prefill.liten }).check();
    cy.waitUntilSaved();
    cy.findByRole('checkbox', { name: appFrontend.group.prefill.middels }).check();
    cy.gotoNavPage('repeating');
    cy.get(appFrontend.group.showGroupToContinue).findByRole('checkbox', { name: 'Ja' }).check();
    cy.get(appFrontend.group.mainGroupTableBody).find('tr').should('have.length', 2);
  });

  it('Navigation on multiPage Group should skip pages with hidden components only', () => {
    cy.interceptLayout('group', (component) => {
      if (component.type === 'RepeatingGroup' && component.id === 'mainGroup') {
        component.children = [
          '0:currentValue',
          '1:newValue',
          '2:cards',
          '3:mainUploaderSingle',
          '3:mainUploaderMulti',
          '4:subGroup',
        ];
        if (component.textResourceBindings) {
          component.textResourceBindings.multipage_back_button = 'Forrige side';
          component.textResourceBindings.multipage_next_button = 'Neste side';
        }
      }
      if (
        (component.id === 'newValue' && component.type === 'Input') ||
        (component.id === 'mainUploaderSingle' && component.type === 'FileUpload')
      ) {
        component.hidden = true;
      }
    });
    init();

    cy.get(appFrontend.group.showGroupToContinue).findByRole('checkbox', { name: 'Ja' }).check();
    cy.get(appFrontend.group.addNewItem).click();
    cy.get(appFrontend.group.mainGroup).should('exist');
    cy.findByRole('textbox', { name: '1. Endre fra' }).should('exist');
    cy.findByRole('textbox', { name: '2. Endre verdi til' }).should('not.exist');
    cy.get(appFrontend.group.mainGroup)
      .findByRole('button', { name: /Neste side/ })
      .click();

    //Make sure this page is skipped when component is hidden.
    cy.findByRole('textbox', { name: '2. Endre verdi til' }).should('not.exist');
    cy.findByRole('heading', { level: 2, name: 'Kilde' }).should('exist');
    cy.get(appFrontend.group.mainGroup)
      .findByRole('button', { name: /Neste side/ })
      .click();
    cy.findByRole('presentation', { name: 'Last opp alle vedlegg med kilde Altinn her' }).should('not.exist');
    cy.findByRole('presentation', { name: 'Multi uploader in repeating group' }).should('exist');
    cy.get(appFrontend.group.mainGroup)
      .findByRole('button', { name: /Neste side/ })
      .click();
    cy.findByRole('table', { name: 'Nested group' }).should('exist');
    cy.get(appFrontend.group.mainGroup)
      .findByRole('button', { name: /Forrige side/ })
      .click();
    cy.findByRole('presentation', { name: 'Multi uploader in repeating group' }).should('exist');
  });
});
