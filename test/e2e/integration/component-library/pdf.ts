import { AppFrontend } from 'test/e2e/pageobjects/app-frontend';

const appFrontend = new AppFrontend();

describe('PDF', () => {
  it('Custom logo and externalApi works in PDF', () => {
    cy.startAppInstance(appFrontend.apps.componentLibrary, { authenticationLevel: '2' });
    cy.waitForLoad();

    cy.testPdf({
      snapshotName: 'custom-logo',
      enableResponseFuzzing: true,
      callback: () => {
        cy.get('[data-testid="pdf-logo"]').should('be.visible');
        cy.getSummary('Eksternt api').should('contain.text', 'firstDetail');
      },
    });
  });
});
