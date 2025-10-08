import { AppFrontend } from 'test/e2e/pageobjects/app-frontend';
import { signingTestLogin } from 'test/e2e/support/apps/signing-test/signing-login';

const appFrontend = new AppFrontend();

describe('Rejecting a signing task', () => {
  it('rejection should work, also when changing a repeating group row after', () => {
    cy.intercept('**/active', []).as('noActiveInstances');
    signingTestLogin('accountant');

    cy.get(appFrontend.signingTest.incomeField).type('84567');
    cy.findByRole('button', { name: 'Legg til ny' }).click();
    cy.dsSelect('#sourceType-0', 'Kryptosvindel');
    cy.findAllByRole('button', { name: 'Lagre og lukk' }).first().click();
    cy.findByRole('button', { name: 'Legg til ny' }).click();
    cy.dsSelect('#sourceType-1', 'Varesalg');
    cy.findAllByRole('button', { name: 'Lagre og lukk' }).first().click();

    cy.get(appFrontend.signingTest.submitButton).click();
    cy.get(appFrontend.signingTest.noAccessPanel).should('be.visible');

    signingTestLogin('manager');

    cy.get(appFrontend.signingTest.managerConfirmPanel).should('be.visible');
    cy.get(appFrontend.signingTest.incomeSummary).should('contain.text', '84 567 000 NOK');
    cy.findAllByTestId('summary-repeating-row').should('have.length', 2);
    cy.findAllByTestId('summary-repeating-row').first().should('contain.text', 'Kryptosvindel');
    cy.findAllByTestId('summary-repeating-row').last().should('contain.text', 'Varesalg');

    cy.get(appFrontend.signingTest.rejectButton).click();
    cy.get(appFrontend.signingTest.incomeField).should('be.visible');

    // Deleting a repeating group row failed before: https://github.com/Altinn/app-frontend-react/issues/3245
    cy.get('tbody tr').should('have.length', 2);
    cy.findByRole('button', { name: /slett varesalg/i }).click();
    cy.get('tbody tr').should('have.length', 1);
    cy.get(appFrontend.signingTest.submitButton).click();

    cy.get(appFrontend.signingTest.managerConfirmPanel).should('be.visible');
    cy.get(appFrontend.signingTest.incomeSummary).should('contain.text', '84 567 000 NOK');
    cy.findByTestId('summary-repeating-row').should('have.length', 1);
    cy.findByTestId('summary-repeating-row').should('contain.text', 'Kryptosvindel');
  });
});
