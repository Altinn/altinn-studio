import { AppFrontend } from 'test/e2e/pageobjects/app-frontend';

const appFrontend = new AppFrontend();

describe('Print button', () => {
  it('check that print button is present, and window.print is called', () => {
    cy.intercept('**/active', []).as('noActiveInstances');
    cy.startAppInstance(appFrontend.apps.frontendTest);
    cy.get(appFrontend.closeButton).should('be.visible');
    cy.get(appFrontend.message['header']).should('exist');
    cy.get(appFrontend.sendinButton).click();

    cy.window().then((win) => {
      const printStub = cy.stub(win, 'print');
      cy.contains('button', 'Print / Lagre PDF')
        .should('be.visible')
        .click()
        .then(() => {
          expect(printStub).to.be.called;
        });
    });
  });
});
