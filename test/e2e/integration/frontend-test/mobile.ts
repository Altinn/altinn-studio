import { AppFrontend } from 'test/e2e/pageobjects/app-frontend';
import { Datalist } from 'test/e2e/pageobjects/datalist';
import { Likert } from 'test/e2e/pageobjects/likert';

import { breakpoints } from 'src/hooks/useIsMobile';
import type { IGroupEditProperties } from 'src/layout/RepeatingGroup/config.generated';

const appFrontend = new AppFrontend();
const likertPage = new Likert();
const dataListPage = new Datalist();

type Mode = 'mobile' | 'tablet';

describe('Mobile', () => {
  it('is possible to submit app instance from mobile', () => {
    cy.viewport('samsung-s10');
    testChangeName();
    cy.get('html.viewport-is-mobile').should('be.visible');
    testGroup('mobile');
    testLikert();
    testList();
    testConfirm();
  });

  it('is possible to submit app instance a tablet', () => {
    cy.viewport(breakpoints.tablet - 5, 1024);
    testChangeName();
    cy.get('html.viewport-is-tablet').should('be.visible');
    testGroup('tablet');
    testLikert();
    testList();
    testConfirm();
  });
});

function testChangeName() {
  cy.goto('changename');

  cy.findByRole('textbox', { name: /du har valgt å endre:/i })
    .parents()
    .eq(5)
    .should('have.css', 'max-width', '100%');
  cy.fillOut('changename');
  cy.intercept('**/api/layoutsettings/group').as('getLayoutGroup');
  cy.get(appFrontend.sendinButton).should('be.visible');
  sendIn();
}

function testGroup(mode: Mode) {
  cy.wait('@getLayoutGroup');
  cy.get(appFrontend.group.prefill.liten).check();
  cy.get(appFrontend.group.prefill.middels).check();
  cy.get(appFrontend.group.prefill.stor).check();
  cy.get(appFrontend.group.prefill.svaer).check();
  cy.get(appFrontend.group.prefill.enorm).check();

  cy.navPage('repeating').click();
  cy.get(appFrontend.group.showGroupToContinue).find('input').check();
  cy.addItemToGroup(1, 2, 'automation');

  // Mobile tables always have two columns
  ensureTableHasNumColumns(appFrontend.group.mainGroup, 6, 2);
  let editWas: IGroupEditProperties = {};
  cy.changeLayout((c) => {
    if (c.id === 'mainGroup' && c.type === 'RepeatingGroup' && c.edit) {
      editWas = { ...c.edit };
      c.edit.editButton = false;
      c.edit.deleteButton = false;
    }
  });
  ensureTableHasNumColumns(appFrontend.group.mainGroup, 6, 2);
  cy.changeLayout((component) => {
    if (component.id === 'mainGroup' && component.type === 'Group' && 'edit' in component && component.edit) {
      component.edit = { ...editWas };
    }
  });

  cy.get(appFrontend.group.hideRepeatingGroupRow).numberFormatClear();
  cy.get(appFrontend.group.hideRepeatingGroupRow).type('1000');

  cy.navPage('repeating (store endringer)').click();
  ensureTableHasNumColumns(appFrontend.group.overflowGroup, 4, 2);

  cy.navPage('hide').click();
  cy.get(appFrontend.group.sendersName).type('automation');

  if (mode === 'mobile') {
    cy.get(appFrontend.navMenu).should('not.exist');
    cy.get(appFrontend.group.navigationBarButton).should('have.attr', 'aria-expanded', 'false').click();
    cy.get(appFrontend.group.navigationBarButton).should('have.attr', 'aria-expanded', 'true');
    cy.get(appFrontend.navMenu).should('be.visible');
    cy.get(appFrontend.navMenu).find('li > button').last().click();
    cy.get(appFrontend.navMenu).should('not.exist');
  } else {
    cy.navPage('summary').click();
  }
  sendIn();
}

function ensureTableHasNumColumns(tableContainer: string, numRows: number, numColumns: number) {
  cy.get(tableContainer)
    .find('table')
    .find('td,th')
    .should('have.length', numRows * numColumns);
}

function testLikert() {
  cy.findByRole('group', { name: likertPage.requiredTableTitle }).within(() => {
    likertPage.requiredQuestions.forEach((question, index) => {
      likertPage.selectRadio(`${question} *`, likertPage.options[index]);
    });
  });
  sendIn();
}

function testList() {
  cy.get(dataListPage.tableBody).contains('Caroline').closest('tr').click();
  cy.get(appFrontend.nextButton).click();
  sendIn();
}

function testConfirm() {
  cy.get(appFrontend.confirm.sendIn).click();
  cy.get(appFrontend.confirm.sendIn).should('not.exist');
  cy.get(appFrontend.receipt.container).should('be.visible');
  cy.get(appFrontend.receipt.linkToArchive).should('be.visible');
}

function sendIn() {
  cy.get(appFrontend.sendinButton).click();
  cy.get(appFrontend.sendinButton).should('not.exist');
}
