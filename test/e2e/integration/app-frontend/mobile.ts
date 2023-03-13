import { AppFrontend } from 'test/e2e/pageobjects/app-frontend';
import { Datalist } from 'test/e2e/pageobjects/datalist';
import { Likert } from 'test/e2e/pageobjects/likert';

const appFrontend = new AppFrontend();
const likertPage = new Likert();
const dataListPage = new Datalist();

describe('Mobile', () => {
  beforeEach(() => {
    cy.viewport('samsung-s10');
  });

  it('is possible to submit app instance from mobile', () => {
    cy.goto('changename');
    cy.get(appFrontend.changeOfName.oldFullName).parents().eq(2).should('have.css', 'max-width', '100%');
    cy.gotoAndComplete('changename');
    cy.intercept('**/api/layoutsettings/group').as('getLayoutGroup');
    cy.get(appFrontend.sendinButton).should('be.visible');
    cy.sendIn();
    cy.wait('@getLayoutGroup');
    cy.get(appFrontend.nextButton).click();
    cy.get(appFrontend.group.showGroupToContinue).then((checkbox) => {
      cy.wrap(checkbox).should('be.visible').find('input').check();
    });
    cy.addItemToGroup(1, 2, 'automation');
    cy.get(appFrontend.nextButton).click();
    cy.get(appFrontend.group.sendersName).should('be.visible').type('automation');
    cy.get(appFrontend.navMenu).should('not.exist');
    cy.get(appFrontend.group.navigationBarButton)
      .should('be.visible')
      .and('have.attr', 'aria-expanded', 'false')
      .click();
    cy.get(appFrontend.group.navigationBarButton).should('have.attr', 'aria-expanded', 'true');
    cy.get(appFrontend.navMenu).should('be.visible');
    cy.get(appFrontend.navMenu).find('li > button').last().click();
    cy.get(appFrontend.navMenu).should('not.exist');
    cy.sendIn();
    likertPage.selectRequiredRadiosInMobile();
    cy.sendIn();
    cy.get(dataListPage.tableBody).contains('Caroline').parent('div').parent('td').parent('tr').click();
    cy.get(appFrontend.nextButton).click();
    cy.sendIn();

    cy.get(appFrontend.confirm.sendIn).should('be.visible').click();
    cy.get(appFrontend.confirm.sendIn).should('not.exist');
    cy.get(appFrontend.receipt.container).should('be.visible');
    cy.get(appFrontend.receipt.linkToArchive).should('be.visible');
  });
});
