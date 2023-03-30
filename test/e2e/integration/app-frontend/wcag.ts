import { AppFrontend } from 'test/e2e/pageobjects/app-frontend';

const appFrontend = new AppFrontend();

describe('WCAG', () => {
  it('WCAG test in changename', () => {
    cy.gotoAndComplete('changename');
    cy.testWcag();
    cy.get(appFrontend.navMenu).find('li > button').last().click();
    cy.testWcag();
  });

  it('WCAG test in group', () => {
    cy.gotoAndComplete('group');
    cy.testWcag();
    cy.get(appFrontend.navMenu).find('li > button').first().click();
    cy.testWcag();

    cy.get(appFrontend.navMenu).find('li > button').eq(1).click();
    cy.testWcag();
    cy.get(appFrontend.group.edit).click();
    cy.testWcag();
    cy.get(appFrontend.group.mainGroup)
      .find(appFrontend.group.editContainer)
      .find(appFrontend.group.next)

      .click();
    cy.testWcag();
  });
});
