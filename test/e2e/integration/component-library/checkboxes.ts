import { AppFrontend } from 'test/e2e/pageobjects/app-frontend';

const appFrontend = new AppFrontend();

describe('Checkboxes component', () => {
  it('Renders the summary2 component with correct text for Checkboxes', () => {
    cy.startAppInstance(appFrontend.apps.componentLibrary, { authenticationLevel: '2' });
    cy.get('#navigation-menu').find('button').contains('4. Avkryssningsbokser').click();

    // Define the text for the last three checkboxes
    const checkboxText1 = 'Korte strekninger med bykjøring, eller annen moro';
    const checkboxText2 = 'Lange strekninger på større veier i Norge';
    const checkboxText3 = 'Kjøring i skogen';

    const expectedText = [checkboxText1, checkboxText2, checkboxText3].join(', ');

    // Click the checkbox for "Korte strekninger med bykjøring, eller annen moro"
    cy.contains('label', checkboxText1).prev('input[type="checkbox"]').check();

    // Click the checkbox for "Lange strekninger på større veier i Norge"
    cy.contains('label', checkboxText2).prev('input[type="checkbox"]').check();

    // Click the checkbox for "Kjøring i skogen"
    cy.contains('label', checkboxText3).prev('input[type="checkbox"]').check();

    cy.get('div[data-componentbaseid="CheckboxesPage-Header-Summary2-Display-String"]')
      .next()
      .find('span.fds-paragraph') // Targets the span with the summary text
      .should('have.text', expectedText);
  });
});
