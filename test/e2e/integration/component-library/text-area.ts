import { AppFrontend } from 'test/e2e/pageobjects/app-frontend';

const appFrontend = new AppFrontend();

describe('TextArea component', () => {
  it('Renders the summary and summary2 component with correct text for TextArea', () => {
    const testText = 'I can type some text\nWith multiple lines\nAnd some more\n\nAnd even more';

    cy.startAppInstance(appFrontend.apps.componentLibrary, { authenticationLevel: '2' });
    cy.gotoNavPage('Langt svar');
    cy.get('#TextareaPage-Textarea').type(testText);
    cy.get('[data-testid="summary-single-value-component"]')
      .eq(0)
      .find('span.ds-paragraph')
      .should('have.text', testText);

    cy.snapshot('textarea');
  });
});
