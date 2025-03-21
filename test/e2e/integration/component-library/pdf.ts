import { AppFrontend } from 'test/e2e/pageobjects/app-frontend';

const appFrontend = new AppFrontend();

describe('PDF', () => {
  it('Custom logo is rendered in PDF', () => {
    cy.startAppInstance(appFrontend.apps.componentLibrary, { authenticationLevel: '2' });
    cy.waitForLoad();

    cy.testPdf({
      snapshotName: 'custom-logo',
      enableResponseFuzzing: true,
      callback: () => {
        cy.get('[data-testid="pdf-logo"]').should('be.visible');
      },
    });
  });
});
