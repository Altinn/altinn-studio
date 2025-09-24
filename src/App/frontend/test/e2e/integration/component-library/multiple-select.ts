import { AppFrontend } from 'test/e2e/pageobjects/app-frontend';

const appFrontend = new AppFrontend();

describe('Multiple select component', () => {
  const multiselect = '#form-content-MultipleSelectPage-Checkboxes2';
  const multiselectList = 'u-datalist[role="listbox"]';
  const summary2 = '[data-componentid=MultipleSelectPage-Header-Summary2-Component2]';
  const repGroup = '[data-componentid=MultipleSelectPage-RepeatingGroup]';

  const checkboxText1 = 'Karoline';
  const checkboxText2 = 'Kåre';
  const checkboxText3 = 'Johanne';
  const checkboxText4 = 'Kari';
  const checkboxText5 = 'Petter';

  it('Adds and removes data properly when using group and soft deletion', () => {
    cy.startAppInstance(appFrontend.apps.componentLibrary, { authenticationLevel: '2' });
    cy.gotoNavPage('Flervalg');

    cy.get(multiselect).click();

    cy.get(multiselectList).contains('span', checkboxText1).click();
    cy.findByRole('button', { name: /Karoline, Press to remove, 1 of 1/i }).should('exist');
    cy.get(multiselectList).contains('span', checkboxText2).click();
    cy.findByRole('button', { name: /Kåre, Press to remove, 2 of 2/i }).should('exist');
    cy.get(multiselectList).contains('span', checkboxText3).click();
    cy.findByRole('button', { name: /Johanne, Press to remove, 3 of 3/i }).should('exist');
    cy.get(multiselectList).contains('span', checkboxText4).click();
    cy.findByRole('button', { name: /Kari, Press to remove, 4 of 4/i }).should('exist');
    cy.get(multiselectList).contains('span', checkboxText5).click();
    cy.findByRole('button', { name: /Petter, Press to remove, 5 of 5/i }).should('exist');

    //Uncheck
    cy.get(multiselectList).contains('span', checkboxText4).click();
    cy.findByRole('button', { name: /^Kari/i }).should('not.exist');
    cy.get(multiselectList).contains('span', checkboxText5).click();
    cy.findByRole('button', { name: /^Petter/i }).should('not.exist');

    // Close the multiple select component
    cy.get(multiselect).type('{esc}');

    //Validate that the corresponding options in checkboxes is available in RepeatingGroup
    cy.get(repGroup).findByRole('cell', { name: checkboxText1 }).should('exist');
    cy.get(repGroup).findByRole('cell', { name: checkboxText2 }).should('exist');
    cy.get(repGroup).findByRole('cell', { name: checkboxText3 }).should('exist');
    cy.get(repGroup).findByRole('cell', { name: checkboxText4 }).should('not.exist');
    cy.get(repGroup).findByRole('cell', { name: checkboxText5 }).should('not.exist');

    // Removing from RepeatingGroup should deselect from List
    cy.get(repGroup).findAllByRole('row').should('have.length', 4); // Header + 1 row
    cy.get(repGroup)
      .findAllByRole('button', { name: /^Slett/ })
      .first()
      .click();
    cy.findByRole('button', { name: /^Karoline/i }).should('not.exist');

    // Unchecking from Checkboxes should remove from RepeatingGroup (observe that data is preserved)
    cy.get(multiselect).type('{esc}'); // Make sure the multiselect is closed
    cy.findByRole('button', { name: /Kåre, Press to remove, 1 of 2/i }).should('exist');
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
    cy.get(multiselect).click();
    cy.get(multiselectList).contains('span', checkboxText2).click();
    cy.get(multiselect).type('{esc}'); // Close the multiple select component
    cy.get(repGroup).findAllByRole('row').should('have.length', 2);

    // Checking 'Kåre' again should not bring back the age
    cy.get(multiselect).click();
    cy.get(multiselectList).contains('span', checkboxText2).click();
    cy.get(multiselect).type('{esc}'); // Close the multiple select component
    cy.get(repGroup).findAllByRole('row').should('have.length', 3); // Header + 1 row
    cy.get(repGroup).findByRole('cell', { name: checkboxText2 }).should('exist');
    cy.get(repGroup).findAllByRole('cell', { name: '20' }).should('exist');
  });

  it('displays the values of the currently selected options', () => {
    cy.startAppInstance(appFrontend.apps.componentLibrary, { authenticationLevel: '2' });
    cy.gotoNavPage('Flervalg');

    cy.get('#form-content-MultipleSelectPage-Checkboxes').click();

    cy.findByRole('option', { name: /Korte strekninger med bykjøring, eller annen moro/i }).click();
    cy.findByRole('option', { name: /Kjøring i skogen/i }).click();
    cy.findByRole('option', { name: /Kjøre til hytta på fjellet/i }).click();

    cy.findByRole('button', {
      name: /Korte strekninger med bykjøring, eller annen moro, Press to remove, 1 of 3/i,
    }).should('exist');
    cy.findByRole('button', { name: /Kjøring i skogen, Press to remove, 2 of 3/i }).should('exist');
    cy.findByRole('button', { name: /Kjøre til hytta på fjellet, Press to remove, 3 of 3/i }).should('exist');

    // The clickable element is a psuedo-element within the button
    cy.findByRole('button', { name: /Kjøring i skogen, Press to remove, 2 of 3/i }).click('right', { force: true });
    cy.findByRole('button', { name: /Bekreft/i }).click();

    cy.findByRole('button', {
      name: /Korte strekninger med bykjøring, eller annen moro, Press to remove, 1 of 2/i,
    }).should('exist');
    cy.findByRole('button', { name: /Kjøre til hytta på fjellet, Press to remove, 2 of 2/i }).should('exist');
  });

  it('Adds and removes data properly when using group and hard deletion', () => {
    cy.interceptLayout('ComponentLayouts', (component) => {
      if (component.type === 'MultipleSelect' && component.id === 'MultipleSelectPage-Checkboxes2') {
        component.deletionStrategy = 'hard';
        component.dataModelBindings.checked = undefined;
      }
    });
    cy.startAppInstance(appFrontend.apps.componentLibrary, { authenticationLevel: '2' });
    cy.gotoNavPage('Flervalg');

    cy.get(multiselect).click();

    // Check options in multiple select component
    cy.get(multiselectList).contains('span', checkboxText1).click();
    cy.findByRole('button', { name: /Karoline, Press to remove, 1 of 1/i }).should('exist');
    cy.get(multiselectList).contains('span', checkboxText2).click();
    cy.findByRole('button', { name: /Kåre, Press to remove, 2 of 2/i }).should('exist');
    cy.get(multiselectList).contains('span', checkboxText3).click();
    cy.findByRole('button', { name: /Johanne, Press to remove, 3 of 3/i }).should('exist');
    cy.get(multiselectList).contains('span', checkboxText4).click();
    cy.findByRole('button', { name: /Kari, Press to remove, 4 of 4/i }).should('exist');
    cy.get(multiselectList).contains('span', checkboxText5).click();
    cy.findByRole('button', { name: /Petter, Press to remove, 5 of 5/i }).should('exist');

    //Uncheck
    cy.get(multiselectList).contains('span', checkboxText4).click();
    cy.findByRole('button', { name: /^Kari/i }).should('not.exist');
    cy.get(multiselectList).contains('span', checkboxText5).click();
    cy.findByRole('button', { name: /^Petter/i }).should('not.exist');

    // Close the multiple select component
    cy.get(multiselect).type('{esc}');

    // Validate that the corresponding options in multiple select is avaliable in repeating group
    cy.get(repGroup).findByRole('cell', { name: checkboxText1 }).should('exist');
    cy.get(repGroup).findByRole('cell', { name: checkboxText2 }).should('exist');
    cy.get(repGroup).findByRole('cell', { name: checkboxText3 }).should('exist');
    cy.get(repGroup).findByRole('cell', { name: checkboxText4 }).should('not.exist');
    cy.get(repGroup).findByRole('cell', { name: checkboxText5 }).should('not.exist');

    // Removing from RepeatingGroup should deselect from List
    cy.get(repGroup).findAllByRole('row').should('have.length', 4); // Header + 3 rows
    cy.get(repGroup)
      .findAllByRole('button', { name: /^Slett/ })
      .first()
      .click();
    cy.findByRole('button', {
      name: /Karoline, Press to remove, 1 of 3/i,
    }).should('not.exist');

    // Unchecking from multiple select should remove from RepeatingGroup (observe that data is preserved)
    cy.get(multiselect).contains('span', checkboxText2).should('exist');
    cy.get(repGroup).findAllByRole('row').should('have.length', 3); // Header + 2 rows
    cy.get(multiselect).type('{esc}'); // Close the multiple select component
    cy.get(repGroup)
      .findAllByRole('button', { name: /^Rediger/ })
      .first()
      .click();
    cy.findByRole('textbox', { name: /Age/ }).type('20');
    cy.findAllByRole('button', { name: /Lagre og lukk/ })
      .last()
      .click();
    cy.get(repGroup).findByRole('cell', { name: checkboxText2 }).parent().contains('td', '20');
    cy.get(multiselect).click();
    cy.get(multiselectList).contains('span', checkboxText2).click();
    cy.get(repGroup).click({ force: true }); //closing the multiselect popover
    cy.get(repGroup).findAllByRole('row').should('have.length', 2);

    // Checking 'Kåre' again should not bring back the age
    cy.get(multiselect).click();
    cy.get(multiselectList).should('be.visible').contains('span', checkboxText2).click();
    cy.get(repGroup).click({ force: true }); //closing the multiselect popover
    cy.get(repGroup).findAllByRole('row').should('have.length', 3); // Header + 1 row
    cy.get(repGroup).findByRole('cell', { name: checkboxText2 }).should('exist');
    cy.get(repGroup).findAllByRole('cell', { name: '20' }).should('not.exist');
  });
  it('Renders the summary2 component with correct text for MultipleSelect', () => {
    cy.startAppInstance(appFrontend.apps.componentLibrary, { authenticationLevel: '2' });
    cy.gotoNavPage('Flervalg');

    // Define the text for the last three checkboxes

    const checkboxText = 'Korte strekninger med bykjøring, eller annen moro';

    cy.get('#form-content-MultipleSelectPage-Checkboxes').click();

    cy.get('u-datalist[role="listbox"]').contains('span', checkboxText).click();
    cy.get('div[data-componentbaseid="MultipleSelectPage-Header-Summary2-Display-String"]')
      .next()
      .find('span.ds-paragraph') // Targets the span with the summary text
      .should('have.text', checkboxText);
  });
  it('Renders the summary2 component with correct text for MultipleSelect with group and soft deletion', () => {
    cy.startAppInstance(appFrontend.apps.componentLibrary, { authenticationLevel: '2' });
    cy.gotoNavPage('Flervalg');

    cy.get(multiselect).click();

    // Check options in multiple select component
    cy.get(multiselectList).contains('span', checkboxText1).click();
    cy.findByRole('button', { name: /Karoline, Press to remove, 1 of 1/i }).should('exist');
    cy.get(multiselectList).contains('span', checkboxText2).click();
    cy.findByRole('button', { name: /Kåre, Press to remove, 2 of 2/i }).should('exist');
    cy.get(multiselectList).contains('span', checkboxText3).click();
    cy.findByRole('button', { name: /Johanne, Press to remove, 3 of 3/i }).should('exist');
    cy.get(multiselectList).contains('span', checkboxText4).click();
    cy.findByRole('button', { name: /Kari, Press to remove, 4 of 4/i }).should('exist');
    cy.get(multiselectList).contains('span', checkboxText5).click();
    cy.findByRole('button', { name: /Petter, Press to remove, 5 of 5/i }).should('exist');

    //Uncheck
    cy.get(multiselectList).contains('span', checkboxText4).click();
    cy.findByRole('button', { name: /^Kari/i }).should('not.exist');
    cy.get(multiselectList).contains('span', checkboxText5).click();
    cy.findByRole('button', { name: /^Petter/i }).should('not.exist');

    // Close the multiple select component
    cy.get(multiselect).type('{esc}');

    const expectedText = [checkboxText1, checkboxText2, checkboxText3].join(', ');

    cy.get(`div${summary2}`)
      .next()
      .find('span.ds-paragraph') // Targets the span with the summary text
      .should('have.text', expectedText);
  });
  it('Renders the summary2 component with correct text for MultipleSelect with group and hard deletion', () => {
    cy.interceptLayout('ComponentLayouts', (component) => {
      if (component.type === 'MultipleSelect' && component.id === 'MultipleSelectPage-Checkboxes2') {
        component.deletionStrategy = 'hard';
        component.dataModelBindings.checked = undefined;
      }
    });
    cy.startAppInstance(appFrontend.apps.componentLibrary, { authenticationLevel: '2' });
    cy.gotoNavPage('Flervalg');

    cy.get(multiselect).click();

    // Check options in multiple select component
    cy.get(multiselectList).contains('span', checkboxText1).click();
    cy.findByRole('button', { name: /Karoline, Press to remove, 1 of 1/i }).should('exist');
    cy.get(multiselectList).contains('span', checkboxText2).click();
    cy.findByRole('button', { name: /Kåre, Press to remove, 2 of 2/i }).should('exist');
    cy.get(multiselectList).contains('span', checkboxText3).click();
    cy.findByRole('button', { name: /Johanne, Press to remove, 3 of 3/i }).should('exist');
    cy.get(multiselectList).contains('span', checkboxText4).click();
    cy.findByRole('button', { name: /Kari, Press to remove, 4 of 4/i }).should('exist');
    cy.get(multiselectList).contains('span', checkboxText5).click();
    cy.findByRole('button', { name: /Petter, Press to remove, 5 of 5/i }).should('exist');

    //Uncheck
    cy.get(multiselectList).contains('span', checkboxText4).click();
    cy.findByRole('button', { name: /^Kari/i }).should('not.exist');
    cy.get(multiselectList).contains('span', checkboxText5).click();
    cy.findByRole('button', { name: /^Petter/i }).should('not.exist');

    // Close the multiple select component
    cy.get(multiselect).type('{esc}');

    const expectedText = [checkboxText1, checkboxText2, checkboxText3].join(', ');

    cy.get(`div${summary2}`)
      .next()
      .find('span.ds-paragraph') // Targets the span with the summary text
      .should('have.text', expectedText);
  });

  it('Required validation shows when MultipleSelect is selected with simpleBinding', () => {
    cy.interceptLayout('ComponentLayouts', (component) => {
      if (component.type === 'MultipleSelect' && component.id === 'MultipleSelectPage-Checkboxes') {
        component.required = true;
      }
    });
    cy.startAppInstance(appFrontend.apps.componentLibrary, { authenticationLevel: '2' });
    cy.gotoNavPage('Oppsummering 2.0');
    cy.findByRole('button', { name: 'Send inn' }).click();
    cy.gotoNavPage('Flervalg');

    const checkboxes = '[data-componentid=MultipleSelectPage-Checkboxes]';
    cy.get(checkboxes).contains('span', 'Du må fylle ut hva skal kjøretøyet brukes til?').should('exist');
    const checkboxText1 = 'Korte strekninger med bykjøring, eller annen moro';
    cy.get('#form-content-MultipleSelectPage-Checkboxes').click();
    cy.get(multiselectList).contains('span', checkboxText1).click();
    cy.get(checkboxes).contains('span', 'Du må fylle ut hva skal kjøretøyet brukes til?').should('not.exist');
  });
  it('Required validation shows when MultipleSelect is selected with group and soft delete', () => {
    cy.interceptLayout('ComponentLayouts', (component) => {
      if (component.type === 'MultipleSelect' && component.id === 'MultipleSelectPage-Checkboxes2') {
        component.required = true;
      }
    });
    cy.startAppInstance(appFrontend.apps.componentLibrary, { authenticationLevel: '2' });
    cy.gotoNavPage('Oppsummering 2.0');
    cy.findByRole('button', { name: 'Send inn' }).click();
    cy.gotoNavPage('Flervalg');

    const checkboxes = '[data-componentid=MultipleSelectPage-Checkboxes2]';

    cy.get(checkboxes).contains('span', 'Du må fylle ut velg personer').should('exist');

    const checkboxText1 = 'Karoline';
    cy.get('#form-content-MultipleSelectPage-Checkboxes2').click();
    cy.get(multiselectList).contains('span', checkboxText1).click();

    cy.get(checkboxes).contains('span', 'Du må fylle ut velg personer').should('not.exist');
  });
  it('Required validation shows when MultipleSelect is selected with group and hard delete', () => {
    cy.interceptLayout('ComponentLayouts', (component) => {
      if (component.type === 'Checkboxes' && component.id === 'MultipleSelectPage-Checkboxes2') {
        component.required = true;
        component.deletionStrategy = 'hard';
        component.dataModelBindings.checked = undefined;
      }
    });
    cy.startAppInstance(appFrontend.apps.componentLibrary, { authenticationLevel: '2' });
    cy.gotoNavPage('Oppsummering 2.0');
    cy.findByRole('button', { name: 'Send inn' }).click();
    cy.gotoNavPage('Flervalg');

    const checkboxes = '[data-componentid=MultipleSelectPage-Checkboxes2]';

    cy.get(checkboxes).contains('span', 'Du må fylle ut velg personer').should('exist');

    cy.get('#form-content-MultipleSelectPage-Checkboxes2').click();
    cy.get(multiselectList).contains('span', checkboxText1).click();

    cy.get(checkboxes).contains('span', 'Du må fylle ut velg personer').should('not.exist');
  });
});
