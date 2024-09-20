import { AppFrontend } from 'test/e2e/pageobjects/app-frontend';

const appFrontend = new AppFrontend();

describe('Multiple select component', () => {
  it('Renders the summary2 component with correct text for MultipleSelext', () => {
    cy.startAppInstance(appFrontend.apps.componentLibrary, { authenticationLevel: '2' });
    cy.gotoNavPage('Flervalg');

    // Define the text for the last three checkboxes

    const checkboxText = 'Korte strekninger med bykjøring, eller annen moro';

    cy.get('#form-content-MultipleSelectPage-Checkboxes').click();

    cy.get('div[role="listbox"]').contains('span', checkboxText).click();
    cy.get('div[data-componentbaseid="MultipleSelectPage-Header-Summary2-Display-String"]')
      .next()
      .find('span.fds-paragraph') // Targets the span with the summary text
      .should('have.text', checkboxText);
  });
});
