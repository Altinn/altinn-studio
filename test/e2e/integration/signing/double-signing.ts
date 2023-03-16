import { AppFrontend } from 'test/e2e/pageobjects/app-frontend';

const appFrontend = new AppFrontend();

describe('Double signing', () => {
  beforeEach(() => {
    cy.intercept('**/active', []).as('noActiveInstances');
    cy.intercept('POST', `**/instances?instanceOwnerPartyId*`).as('createInstance');
  });

  it('accountant -> manager -> auditor', () => {
    cy.startAppInstance(appFrontend.apps.signingTest, 'accountant');
    cy.assertUser('accountant');

    cy.get(appFrontend.signingTest.incomeField).type('4567');
    cy.get(appFrontend.signingTest.submitButton).click();
    cy.get(appFrontend.signingTest.managerConfirmPanel).should('exist').and('be.visible');
    // TODO: Check that confirm is disabled / not available

    cy.switchUser('manager');
    cy.assertUser('manager');

    cy.get(appFrontend.signingTest.incomeField).should('contain.value', '4 567 000 NOK');
    cy.get(appFrontend.signingTest.confirmButton).click();
    cy.get(appFrontend.signingTest.auditorConfirmPanel).should('exist').and('be.visible');
    // TODO: Check that confirm is disabled / not available

    cy.switchUser('auditor');
    cy.assertUser('auditor');

    cy.get(appFrontend.signingTest.incomeField).should('contain.value', '4 567 000 NOK');
    cy.get(appFrontend.signingTest.confirmButton).click();
    cy.get(appFrontend.receipt.container).should('exist').and('be.visible');
  });

  it('manager -> manager -> auditor', () => {
    cy.startAppInstance(appFrontend.apps.signingTest, 'manager');
    cy.assertUser('manager');

    cy.get(appFrontend.signingTest.incomeField).type('4567');
    cy.get(appFrontend.signingTest.submitButton).click();

    cy.get(appFrontend.signingTest.managerConfirmPanel).should('exist').and('be.visible');
    cy.get(appFrontend.signingTest.incomeField).should('contain.value', '4 567 000 NOK');
    cy.get(appFrontend.signingTest.confirmButton).click();
    cy.get(appFrontend.signingTest.auditorConfirmPanel).should('exist').and('be.visible');
    // TODO: Check that confirm is disabled / not available

    cy.switchUser('auditor');
    cy.assertUser('auditor');

    cy.get(appFrontend.signingTest.incomeField).should('contain.value', '4 567 000 NOK');
    cy.get(appFrontend.signingTest.confirmButton).click();
    cy.get(appFrontend.receipt.container).should('exist').and('be.visible');
  });
});
