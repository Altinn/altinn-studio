import { AppFrontend } from 'test/e2e/pageobjects/app-frontend';

const appFrontend = new AppFrontend();

describe('PDF rendering', () => {
  it('Make sure the pdf logo is displayed when rendering in PDF mode only', () => {
    cy.startAppInstance(appFrontend.apps.componentLibrary, { authenticationLevel: '2' });
    cy.get('ul#navigation-menu > li').last().click();
    cy.get('[data-testid="pdf-logo"]').should('not.exist');
    cy.url().then((currentUrl) => {
      const newUrl = `${currentUrl}?pdf=1`;
      cy.visit(newUrl);
      cy.get('[data-testid="pdf-logo"]').should('exist');
    });
  });
});
