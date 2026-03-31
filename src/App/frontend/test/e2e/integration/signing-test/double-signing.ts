import { AppFrontend } from 'test/e2e/pageobjects/app-frontend';
import { signingTestLogin } from 'test/e2e/support/apps/signing-test/signing-login';

const appFrontend = new AppFrontend();

describe('Double signing', () => {
  beforeEach(() => {
    cy.intercept('**/active', []).as('noActiveInstances');
    cy.intercept('POST', `**/instances?instanceOwnerPartyId*`).as('createInstance');
  });

  it('accountant -> manager -> auditor', () => {
    signingTestLogin('accountant');

    cy.get(appFrontend.signingTest.incomeField).type('4567');

    cy.get(appFrontend.signingTest.submitButton).should('not.be.disabled').click();
    cy.get(appFrontend.signingTest.noAccessPanel).should('exist').and('be.visible');

    cy.visualTesting('signing:accountant');

    signingTestLogin('manager');
    cy.get(appFrontend.signingTest.managerConfirmPanel).should('exist').and('be.visible');
    cy.get(appFrontend.signingTest.incomeSummary).should('contain.text', '4 567 000 NOK');

    cy.get(appFrontend.signingTest.signingButton).should('not.be.disabled').click();
    cy.get(appFrontend.signingTest.sentToAuditor).should('exist').and('be.visible');

    cy.visualTesting('signing:manager');

    signingTestLogin('auditor');
    cy.get(appFrontend.signingTest.auditorConfirmPanel).should('exist').and('be.visible');
    cy.get(appFrontend.signingTest.incomeSummary).should('contain.text', '4 567 000 NOK');
    cy.get(appFrontend.signingTest.signingButton).should('not.be.disabled').click();
    cy.get(appFrontend.receipt.container).should('exist').and('be.visible');

    cy.visualTesting('signing:auditor');
  });

  it('manager -> manager -> auditor', () => {
    signingTestLogin('manager');

    cy.get(appFrontend.signingTest.incomeField).type('4567');

    cy.get(appFrontend.signingTest.submitButton).should('not.be.disabled').click();
    cy.get(appFrontend.signingTest.managerConfirmPanel).should('exist').and('be.visible');
    cy.get(appFrontend.signingTest.incomeSummary).should('contain.text', '4 567 000 NOK');

    cy.get(appFrontend.signingTest.signingButton).should('not.be.disabled').click();
    cy.get(appFrontend.signingTest.sentToAuditor).should('exist').and('be.visible');

    signingTestLogin('auditor');
    cy.get(appFrontend.signingTest.auditorConfirmPanel).should('exist').and('be.visible');
    cy.get(appFrontend.signingTest.incomeSummary).should('contain.text', '4 567 000 NOK');
    cy.get(appFrontend.signingTest.signingButton).should('not.be.disabled').click();
    cy.get(appFrontend.receipt.container).should('exist').and('be.visible');
  });
});
