import { AppFrontend } from 'test/e2e/pageobjects/app-frontend';

const appFrontend = new AppFrontend();

describe('WCAG', () => {
  it('WCAG test in changename', () => {
    cy.gotoAndComplete('changename');
    cy.navPage('form').click();
    cy.testWcag();
    cy.navPage('summary').click();
    cy.testWcag();
    cy.navPage('grid').click();
    cy.testWcag();
  });

  it('WCAG test in group', () => {
    cy.gotoAndComplete('group');
    cy.navPage('prefill').click();
    cy.testWcag();
    cy.navPage('repeating').click();
    cy.testWcag();
    cy.get(appFrontend.group.edit).click();
    cy.testWcag();
    cy.get(appFrontend.group.mainGroup).find(appFrontend.group.editContainer).find(appFrontend.group.next).click();
    cy.testWcag();
    cy.navPage('hide').click();
    cy.testWcag();
  });
});
