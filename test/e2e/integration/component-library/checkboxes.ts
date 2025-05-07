import { AppFrontend } from 'test/e2e/pageobjects/app-frontend';

const appFrontend = new AppFrontend();

describe('Checkboxes component', () => {
  it('Renders the summary2 component with correct text for Checkboxes', () => {
    cy.startAppInstance(appFrontend.apps.componentLibrary, { authenticationLevel: '2' });
    cy.gotoNavPage('Avkryssningsbokser');

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

  it('Adds and removes data properly when using group and soft deletion', () => {
    cy.startAppInstance(appFrontend.apps.componentLibrary, { authenticationLevel: '2' });
    cy.gotoNavPage('Avkryssningsbokser');

    const checkboxes = '[data-componentid=CheckboxesPage-Checkboxes2]';
    const repGroup = '[data-componentid=CheckboxesPage-RepeatingGroup]';

    // Define the text for the last three checkboxes
    const checkboxText1 = 'Karoline';
    const checkboxText2 = 'Kåre';
    const checkboxText3 = 'Johanne';
    const checkboxText4 = 'Kari';
    const checkboxText5 = 'Petter';

    //Check options in checkboxes component
    cy.get(checkboxes).contains('label', checkboxText1).prev('input[type="checkbox"]').click();
    cy.get(checkboxes).contains('label', checkboxText2).prev('input[type="checkbox"]').click();
    cy.get(checkboxes).contains('label', checkboxText3).prev('input[type="checkbox"]').click();
    cy.get(checkboxes).contains('label', checkboxText4).prev('input[type="checkbox"]').click();
    cy.get(checkboxes).contains('label', checkboxText5).prev('input[type="checkbox"]').click();

    //Uncheck
    cy.get(checkboxes).contains('label', checkboxText4).prev('input[type="checkbox"]').click();
    cy.get(checkboxes).contains('label', checkboxText5).prev('input[type="checkbox"]').click();

    //Check that checkboxes is correct
    cy.get(checkboxes).contains('label', checkboxText1).prev('input[type="checkbox"]').should('be.checked');
    cy.get(checkboxes).contains('label', checkboxText2).prev('input[type="checkbox"]').should('be.checked');
    cy.get(checkboxes).contains('label', checkboxText3).prev('input[type="checkbox"]').should('be.checked');
    cy.get(checkboxes).contains('label', checkboxText4).prev('input[type="checkbox"]').should('not.be.checked');
    cy.get(checkboxes).contains('label', checkboxText5).prev('input[type="checkbox"]').should('not.be.checked');

    //Validate that the corresponding options in checkboxes is avaliable in repeating group<
    cy.get(repGroup).findByRole('cell', { name: checkboxText1 }).should('exist');
    cy.get(repGroup).findByRole('cell', { name: checkboxText2 }).should('exist');
    cy.get(repGroup).findByRole('cell', { name: checkboxText3 }).should('exist');

    // Removing from RepeatingGroup should deselect from List
    cy.get(repGroup).findAllByRole('row').should('have.length', 4); // Header + 1 row
    cy.get(repGroup)
      .findAllByRole('button', { name: /^Slett/ })
      .first()
      .click();
    cy.get(checkboxes).contains('label', checkboxText1).prev('input[type="checkbox"]').should('not.be.checked');

    // Unchecking from Checkboxes should remove from RepeatingGroup (observe that data is preserved)
    cy.get(checkboxes).contains('label', checkboxText2).prev('input[type="checkbox"]').should('be.checked');
    cy.get(repGroup).findAllByRole('row').should('have.length', 3); // Header + 2 row
    cy.get(repGroup)
      .findAllByRole('button', { name: /^Rediger/ })
      .first()
      .click();
    cy.findByRole('textbox', { name: /Age/ }).type('20');
    cy.findAllByRole('button', { name: /Lagre og lukk/ })
      .last()
      .click();
    cy.get(repGroup).findByRole('cell', { name: checkboxText2 }).parent().contains('td', '20');
    cy.get(checkboxes).contains('label', checkboxText2).prev('input[type="checkbox"]').click();

    cy.get(repGroup).findAllByRole('row').should('have.length', 2);

    // Checking 'Kåre' again should bring back the surname
    cy.get(checkboxes).contains('label', checkboxText2).prev('input[type="checkbox"]').click();
    cy.get(repGroup).findAllByRole('row').should('have.length', 3); // Header + 1 row
    cy.get(repGroup).findByRole('cell', { name: checkboxText2 }).should('exist');
    cy.get(repGroup).findAllByRole('cell', { name: '20' }).should('exist');
  });

  it('Renders the summary2 component with correct text for Checkboxes with group and soft deletion', () => {
    cy.startAppInstance(appFrontend.apps.componentLibrary, { authenticationLevel: '2' });
    cy.gotoNavPage('Avkryssningsbokser');

    const checkboxes = '[data-componentid=CheckboxesPage-Checkboxes2]';
    const summary2 = '[data-componentid=CheckboxesPage-Header-Summary2-Component2]';

    const checkboxText1 = 'Karoline';
    const checkboxText2 = 'Kåre';
    const checkboxText3 = 'Johanne';
    const checkboxText4 = 'Kari';
    const checkboxText5 = 'Petter';

    //Check options in checkboxes component
    cy.get(checkboxes).contains('label', checkboxText1).prev('input[type="checkbox"]').click();
    cy.get(checkboxes).contains('label', checkboxText2).prev('input[type="checkbox"]').click();
    cy.get(checkboxes).contains('label', checkboxText3).prev('input[type="checkbox"]').click();
    cy.get(checkboxes).contains('label', checkboxText4).prev('input[type="checkbox"]').click();
    cy.get(checkboxes).contains('label', checkboxText5).prev('input[type="checkbox"]').click();

    //Uncheck
    cy.get(checkboxes).contains('label', checkboxText4).prev('input[type="checkbox"]').click();
    cy.get(checkboxes).contains('label', checkboxText5).prev('input[type="checkbox"]').click();

    //Check that checkboxes is correct
    cy.get(checkboxes).contains('label', checkboxText1).prev('input[type="checkbox"]').should('be.checked');
    cy.get(checkboxes).contains('label', checkboxText2).prev('input[type="checkbox"]').should('be.checked');
    cy.get(checkboxes).contains('label', checkboxText3).prev('input[type="checkbox"]').should('be.checked');
    cy.get(checkboxes).contains('label', checkboxText4).prev('input[type="checkbox"]').should('not.be.checked');
    cy.get(checkboxes).contains('label', checkboxText5).prev('input[type="checkbox"]').should('not.be.checked');

    const expectedText = [checkboxText1, checkboxText2, checkboxText3].join(', ');

    cy.get(`div${summary2}`)
      .next()
      .find('span.fds-paragraph') // Targets the span with the summary text
      .should('have.text', expectedText);
  });
});
