import { AppFrontend } from 'test/e2e/pageobjects/app-frontend';

const appFrontend = new AppFrontend();

describe('Input component', () => {
  it('Renders the summary2 component with correct text', () => {
    const testText = 'I type some text';

    cy.startAppInstance(appFrontend.apps.componentLibrary, { authenticationLevel: '2' });
    cy.gotoNavPage('Kort svar');
    cy.get('#InputPage-Input').type(testText);

    // Verify Gateadresse (Street address)
    cy.get('[data-testid="summary-single-value-component"]')
      .eq(0)
      .find('span.fds-paragraph')
      .should('have.text', testText);
  });
});
