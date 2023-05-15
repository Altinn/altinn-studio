import { AppFrontend } from 'test/e2e/pageobjects/app-frontend';

const appFrontend = new AppFrontend();

describe('Print button', () => {
  it('check that print button is present, and window.print is called', () => {
    cy.intercept('**/active', []).as('noActiveInstances');
    cy.startAppInstance(appFrontend.apps.frontendTest);
    cy.get(appFrontend.closeButton).should('be.visible');
    cy.findByRole('heading', { name: /Appen for test av app frontend/i }).should('exist');
    cy.get(appFrontend.sendinButton).click();

    cy.window().then((win) => {
      const printStub = cy.stub(win, 'print');
      // eslint-disable-next-line cypress/unsafe-to-chain-command
      cy.contains('button', 'Print / Lagre PDF')
        .click()
        .then(() => {
          expect(printStub).to.be.called;
        });
    });
  });
});
