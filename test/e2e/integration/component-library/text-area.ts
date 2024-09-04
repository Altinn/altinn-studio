import { AppFrontend } from 'test/e2e/pageobjects/app-frontend';

const appFrontend = new AppFrontend();

describe('TextArea component', () => {
  it('Renders the summary2 component with correct text for TextArea', () => {
    const testText = 'I type some text';

    cy.startAppInstance(appFrontend.apps.componentLibrary, { authenticationLevel: '2' });
    cy.get('#navigation-menu').find('button').contains('2. Langt svar').click();
    cy.get('#TextareaPage-Textarea').type(testText);
    cy.get('[data-testid="summary-single-value-component"]')
      .eq(0)
      .find('span.fds-paragraph')
      .should('have.text', testText);
  });
});
