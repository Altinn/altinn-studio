import { AppFrontend } from 'test/e2e/pageobjects/app-frontend';

const appFrontend = new AppFrontend();

describe('Double signing', () => {
  beforeEach(() => {
    cy.intercept('**/active', []).as('noActiveInstances');
    cy.intercept('POST', `**/instances?instanceOwnerPartyId*`).as('createInstance');
  });

  it('accountant -> manager -> auditor', () => {
    cy.startAppInstance(appFrontend.apps.signingTest, { user: 'accountant' });
    cy.assertUser('accountant');

    cy.get(appFrontend.signingTest.incomeField).type('4567');

    cy.get(appFrontend.signingTest.submitButton).should('not.be.disabled').click();
    cy.get(appFrontend.signingTest.noAccessPanel).should('exist').and('be.visible');

    cy.snapshot('signing:accountant');

    cy.switchUser('manager');
    cy.assertUser('manager');

    cy.get(appFrontend.signingTest.managerConfirmPanel).should('exist').and('be.visible');
    cy.get(appFrontend.signingTest.incomeSummary).should('contain.text', '4 567 000 NOK');

    cy.get(appFrontend.signingTest.signingButton).should('not.be.disabled').click();
    cy.get(appFrontend.signingTest.sentToAuditor).should('exist').and('be.visible');

    cy.snapshot('signing:manager');

    cy.switchUser('auditor');
    cy.assertUser('auditor');

    cy.get(appFrontend.signingTest.auditorConfirmPanel).should('exist').and('be.visible');
    cy.get(appFrontend.signingTest.incomeSummary).should('contain.text', '4 567 000 NOK');
    cy.get(appFrontend.signingTest.signingButton).should('not.be.disabled').click();
    cy.get(appFrontend.receipt.container).should('exist').and('be.visible');

    cy.snapshot('signing:auditor');
  });

  it('manager -> manager -> auditor', () => {
    cy.startAppInstance(appFrontend.apps.signingTest, { user: 'manager' });
    cy.assertUser('manager');

    cy.get(appFrontend.signingTest.incomeField).type('4567');

    cy.get(appFrontend.signingTest.submitButton).should('not.be.disabled').click();
    cy.get(appFrontend.signingTest.managerConfirmPanel).should('exist').and('be.visible');
    cy.get(appFrontend.signingTest.incomeSummary).should('contain.text', '4 567 000 NOK');

    cy.get(appFrontend.signingTest.signingButton).should('not.be.disabled').click();
    cy.get(appFrontend.signingTest.sentToAuditor).should('exist').and('be.visible');

    cy.switchUser('auditor');
    cy.assertUser('auditor');

    cy.get(appFrontend.signingTest.auditorConfirmPanel).should('exist').and('be.visible');
    cy.get(appFrontend.signingTest.incomeSummary).should('contain.text', '4 567 000 NOK');
    cy.get(appFrontend.signingTest.signingButton).should('not.be.disabled').click();
    cy.get(appFrontend.receipt.container).should('exist').and('be.visible');
  });
});
