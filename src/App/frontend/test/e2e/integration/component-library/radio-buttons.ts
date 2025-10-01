import { AppFrontend } from 'test/e2e/pageobjects/app-frontend';

const appFrontend = new AppFrontend();

describe('RadioButtons component', () => {
  it('Renders the summary2 component with correct text for RadioButtons', () => {
    const testText = 'Bil';

    cy.startAppInstance(appFrontend.apps.componentLibrary, { authenticationLevel: '2' });
    cy.gotoNavPage('Radioknapper');
    cy.contains('label', testText).click();
    cy.get('[data-testid="summary-single-value-component"]')
      .eq(0)
      .find('span.ds-paragraph')
      .should('have.text', testText);
  });
});
