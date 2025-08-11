import { AppFrontend } from 'test/e2e/pageobjects/app-frontend';

import { typedBoolean } from 'src/utils/typing';
import type { IRawOption } from 'src/layout/common.generated';

const appFrontend = new AppFrontend();

describe('Options', () => {
  it('is possible to retrieve options dynamically', () => {
    cy.goto('changename');
    // Case: options are dynamically refetched based on what the user selects as source, so we should wait until
    // the pre-selected value is set first.
    cy.get(appFrontend.changeOfName.sources).should('have.value', 'Altinn');

    cy.dsSelect(appFrontend.changeOfName.reference, 'Ola Nordmann');
    cy.get(appFrontend.changeOfName.reference).should('have.value', 'Ola Nordmann');

    //Secure options
    cy.dsSelect(appFrontend.changeOfName.reference2, 'Ole');
    cy.get(appFrontend.changeOfName.reference2).should('have.value', 'Ole');

    // Select a different source, expect previous selection to be cleared and
    // new value to be selectable in the reference option
    cy.dsSelect(appFrontend.changeOfName.sources, 'Digitaliseringsdirektoratet');
    cy.get(appFrontend.changeOfName.reference).should('have.value', '');
    cy.dsSelect(appFrontend.changeOfName.reference, 'Sophie Salt');
    cy.get(appFrontend.changeOfName.reference).should('have.value', 'Sophie Salt');
    cy.dsSelect(appFrontend.changeOfName.reference2, 'Dole');
    cy.get(appFrontend.changeOfName.reference2).should('have.value', 'Dole');

    /** TODO: Enable this part again when the bug is fixed
     * @see https://github.com/digdir/designsystemet/issues/2264
     * @see https://github.com/Altinn/app-frontend-react/issues/2486
     * @see https://github.com/Altinn/app-frontend-react/pull/2500
    // If we change the source back to the previous one, the previous selections should be cleared
    // and the previous options should be available again
    cy.dsSelect(appFrontend.changeOfName.sources, 'Altinn');
    cy.get(appFrontend.changeOfName.reference).should('have.value', '');
    cy.dsSelect(appFrontend.changeOfName.reference, 'Ola Nordmann');
    cy.get(appFrontend.changeOfName.reference).should('have.value', 'Ola Nordmann');
    cy.get(appFrontend.changeOfName.reference2).should('have.value', '');
    cy.dsSelect(appFrontend.changeOfName.reference2, 'Ole');
    cy.get(appFrontend.changeOfName.reference2).should('have.value', 'Ole');
    */
  });

  it('is possible to build options from repeating groups', () => {
    cy.goto('group');
    cy.get(appFrontend.navMenu).should('be.visible');
    cy.findByRole('button', { name: /Neste/ }).click();
    cy.get(appFrontend.group.showGroupToContinue).findByRole('checkbox', { name: 'Ja' }).check();
    cy.addItemToGroup(1, 2, 'automation');
    cy.addItemToGroup(3, 4, 'altinn');
    cy.get(appFrontend.group.options).click();
    cy.findByRole('option', { name: 'Endre fra: 1, Endre til: 2' }).should('be.visible');
    cy.findByRole('option', { name: 'Endre fra: 3, Endre til: 4' }).should('be.visible');
    cy.findByRole('option', { name: 'Endre fra: 1, Endre til: 2' }).click();
    cy.get(appFrontend.group.options).should('have.value', 'Endre fra: 1, Endre til: 2');
  });

  it('is possible to use dynamic expressions in "source" when building options from repeating groups', () => {
    cy.goto('group');
    cy.get(appFrontend.navMenu).should('be.visible');
    cy.findByRole('button', { name: /Neste/ }).click();

    cy.findByRole('checkbox', { name: /ja/i }).click();
    cy.addItemToGroup(1, 2, 'automation');
    cy.addItemToGroup(3, 4, 'altinn');

    cy.get(appFrontend.group.optionsDynamic).click();

    /**
     * This tests that a Dropdown which has added dynamic expressions for the label property
     * The expression: ["concat",["text", "optionsFromRepeatingGroup"], ["concat", " ", ["text", "question-1"]]]
     */
    cy.findByRole('option', { name: 'Endre fra: 1, Endre til: 2 Gjør du leksene dine?' }).should('be.visible');
    cy.findByRole('option', { name: 'Endre fra: 3, Endre til: 4 Gjør du leksene dine?' }).should('be.visible');
  });

  it('is possible to use dynamic expressions in "source" when building options from repeating groups with Radio buttons', () => {
    cy.goto('group');
    cy.get(appFrontend.navMenu).should('be.visible');
    cy.findByRole('button', { name: /Neste/ }).click();
    cy.findByRole('checkbox', { name: /ja/i }).click();
    cy.addItemToGroup(1, 2, 'automation');
    cy.addItemToGroup(3, 4, 'altinn');

    /**
     * This tests that a RadioButtons which has added dynamic expressions for the label,
     *  description, and helpText properties. The expression:
     * ["concat",["text", "optionsFromRepeatingGroup"], ["concat", " ", ["text", "question-2"]]]
     */
    cy.findByRole('radio', { name: /endre fra: 1, endre til: 2 fungerer kalkulatoren din/i }).should('exist');
    cy.findByRole('radio', { name: /endre fra: 3, endre til: 4 fungerer kalkulatoren din/i }).should('exist');
  });

  it('mapping updates options, but does not always unselect previous options', () => {
    for (const optionsId of ['references', 'test']) {
      cy.intercept({ method: 'GET', url: `**/options/${optionsId}**` }, (req) => {
        req.reply((res) => {
          const options = res.body as IRawOption[];
          options.push({
            value: 'fixedValue',
            label: 'My fixed value',
          });
          res.send(JSON.stringify(options));
        });
      }).as(`interceptOptions(${optionsId})`);
    }

    cy.goto('changename');

    // All options are fetched once at first (with 'undefined' in mapping, as no value for source has been set)
    cy.get('@interceptOptions(references).all').should('have.length', 1);
    cy.get('@interceptOptions(test).all').should('have.length', 1);

    // This field uses preselectedOptionIndex to select 'Altinn'
    cy.get(appFrontend.changeOfName.sources).should('have.value', 'Altinn');

    // At that point our options have new mappings, so requests should have fired again
    cy.get('@interceptOptions(references).all').should('have.length', 2);
    cy.get('@interceptOptions(test).all').should('have.length', 2);

    cy.dsSelect(appFrontend.changeOfName.reference, 'My fixed value');
    cy.get(appFrontend.changeOfName.reference).should('have.value', 'My fixed value');
    cy.dsSelect(appFrontend.changeOfName.reference2, 'My fixed value');
    cy.get(appFrontend.changeOfName.reference2).should('have.value', 'My fixed value');

    // Selecting a new source now causes requests to fire once more with new mapping,
    // but the fixed value should stay in place as they were present in both the old and new options responses
    cy.dsSelect(appFrontend.changeOfName.sources, 'Digitaliseringsdirektoratet');
    cy.get(appFrontend.changeOfName.sources).should('have.value', 'Digitaliseringsdirektoratet');
    cy.get('@interceptOptions(references).all').should('have.length', 3);
    cy.get('@interceptOptions(test).all').should('have.length', 3);

    cy.get(appFrontend.changeOfName.reference).should('have.value', 'My fixed value');
    cy.get(appFrontend.changeOfName.reference2).should('have.value', 'My fixed value');
  });

  it('retrieves metadata from header when metadata is set in datamodelBindings', () => {
    cy.intercept({ method: 'GET', url: '**/options/**' }).as('optionsMunicipality');

    cy.goto('changename');
    cy.wait('@optionsMunicipality');

    cy.dsSelect(appFrontend.changeOfName.municipality, 'Oslo');

    cy.get(appFrontend.changeOfName.municipalityMetadata)
      .should('have.prop', 'value')
      .should('match', /language=nb,id=131,variant=,date=\d{1,2}[/.]\d{1,2}[/.]\d{4},level=,parentCode=/);
  });

  it('clears options when source changes and old value is no longer valid', () => {
    cy.goto('changename');

    cy.get(appFrontend.changeOfName.sources).should('have.value', 'Altinn');

    cy.dsSelect(appFrontend.changeOfName.reference, 'Ola Nordmann');
    cy.get(appFrontend.changeOfName.reference).should('have.value', 'Ola Nordmann');

    cy.gotoNavPage('summary');

    cy.get(appFrontend.changeOfName.summaryReference).should('contain.text', 'Altinn');
    cy.get(appFrontend.changeOfName.summaryReference).should('contain.text', 'Ola Nordmann');

    cy.gotoNavPage('form');

    cy.dsSelect(appFrontend.changeOfName.sources, 'Digitaliseringsdirektoratet');
    cy.get(appFrontend.changeOfName.sources).should('have.value', 'Digitaliseringsdirektoratet');
    cy.get(appFrontend.changeOfName.reference).should('not.have.value', 'Ola Nordmann');

    cy.gotoNavPage('summary');

    cy.get(appFrontend.changeOfName.summaryReference).should('contain.text', 'Digitaliseringsdirektoratet');
    cy.get(appFrontend.changeOfName.summaryReference).should('not.contain.text', 'Ola Nordmann');
    cy.get(appFrontend.changeOfName.summaryReference).should('not.contain.text', 'nordmann');
  });

  function interceptAndChangeOptions(matching: (url: string) => boolean, mutator: (options: IRawOption[]) => void) {
    cy.intercept({ method: 'GET', url: '**/options/**' }, (req) => {
      req.reply((res) => {
        if (!matching(req.url)) {
          res.send(JSON.stringify(res.body));
          return;
        }

        const options = res.body as IRawOption[];
        mutator(options);
        res.send(JSON.stringify(options));
      });
    });
  }

  it('does not clear options when source changes and the old value is still valid', () => {
    interceptAndChangeOptions(
      (url) => url.includes('references') && url.includes('source=digdir'),
      (options) => options.push({ value: 'nordmann', label: 'Fortsatt Ola Nordmann' }),
    );
    cy.goto('changename');

    cy.get(appFrontend.changeOfName.sources).should('have.value', 'Altinn');

    cy.dsSelect(appFrontend.changeOfName.reference, 'Ola Nordmann');
    cy.get(appFrontend.changeOfName.reference).should('have.value', 'Ola Nordmann');

    cy.dsSelect(appFrontend.changeOfName.sources, 'Digitaliseringsdirektoratet');
    cy.get(appFrontend.changeOfName.sources).should('have.value', 'Digitaliseringsdirektoratet');

    cy.get(appFrontend.changeOfName.reference).should('have.value', 'Fortsatt Ola Nordmann');
  });

  it('should not clear stale values when the component is hidden', () => {
    cy.gotoHiddenPage('conflicting-options');
    const headerRow = '#group-animals-table-header tr';
    cy.get(headerRow).find('th').eq(0).should('have.text', 'Type');
    cy.get(headerRow).find('th').eq(1).should('have.text', 'Antall bein');
    cy.get(headerRow).find('th').eq(2).should('have.text', 'Antall bein (utland)');
    cy.get(headerRow).find('th').eq(3).should('have.text', 'Farger');
    cy.get(headerRow).find('th').eq(4).should('have.text', 'Kommentartyper');

    const mainTableRow = '#group-animals-table-body tr';
    const nestedTableRow = '[id^="group-animalComments-"][id$="-table-body"] tr';
    cy.get(mainTableRow).should('have.length', 2);

    const CommentTypes = {
      '': { label: '', value: '' }, // Represents a missing value

      // Valid for domestic animals
      Criticism: { label: 'Kritikk', value: 'CRITICISM' },
      Spam: { label: 'Søppel', value: 'SPAM' },

      // Valid for foreign animals
      Praise: { label: 'Skryt', value: 'PRAISE' },
      Suggestions: { label: 'Forslag', value: 'SUGGESTIONS' },
    };

    function assertRow(
      row: number,
      type: string,
      numLegs: string,
      numLegsForeign: string,
      colors: string,
      commentTypes: [keyof typeof CommentTypes, keyof typeof CommentTypes],
    ) {
      cy.get(mainTableRow).eq(row).find('td').eq(0).should('have.text', type); // Type
      cy.get(mainTableRow).eq(row).find('td').eq(1).should('have.text', numLegs); // Antall bein
      cy.get(mainTableRow).eq(row).find('td').eq(2).should('have.text', numLegsForeign); // Antall bein (utland)
      cy.get(mainTableRow).eq(row).find('td').eq(3).should('have.text', colors); // Farger

      // This compound column shows the labels of the selected comment types (but filters out the empty string)
      const commentTypeLabels = commentTypes
        .filter(typedBoolean)
        .map((t) => CommentTypes[t].label)
        .join(', ');

      cy.get(mainTableRow).eq(row).find('td').eq(4).should('have.text', commentTypeLabels);

      cy.get(mainTableRow).eq(row).find('button').click();
      cy.get(nestedTableRow).should('have.length', 2);
      cy.get(nestedTableRow).eq(0).find('td').eq(0).should('have.text', CommentTypes[commentTypes[0]].label);
      cy.get(nestedTableRow).eq(1).find('td').eq(0).should('have.text', CommentTypes[commentTypes[1]].label);

      // Foreign components are hidden, so they will show the value (if they were visible, they would clear the value
      // as it's not valid for these components)
      cy.get(nestedTableRow).eq(0).find('td').eq(1).should('have.text', CommentTypes[commentTypes[0]].value);
      cy.get(nestedTableRow).eq(1).find('td').eq(1).should('have.text', CommentTypes[commentTypes[1]].value);

      cy.get(mainTableRow).eq(row).find('button').click();
      cy.get(nestedTableRow).should('not.exist');
    }

    // The table here is full of mistakes and bugs, caused by our deletion of stale values. We should fix the root
    // causes of these issues and possibly introduce validation for the values that are not in an option list
    // instead of just removing them. On the other hand, garbage collection in the data model might want to hold
    // on to these removed values in case they are valid again later. This test then serves as a reminder of the
    // issues that need to be fixed, and it is expected to fail at some point in the future when the issues are fixed.
    // Remember to update the test at that point.

    // Cell 3: This shows the _value_ from option list, not the label. That should not show up there, but we can't
    // change it while staying backwards compatible
    // Cell 4: The cat is also brown, but brown is only valid when isForeign is set to 'true' (it defaults to 'false').
    // The brown value is thus removed on load, but in the future we should keep it and show it if the isForeign
    // radio button is set to 'true'.
    assertRow(0, 'Katt', 'fire', '4', 'Svart', ['Criticism', '']);

    // Cell 2: Tigers have 5 legs when loading, but that's not valid unless we set isForeign to 'true'.
    // Cell 3: Since the data is deleted because it's not valid in the previous row, this will be empty. It would
    // be more logical if this showed '5', but that's not the case. The best would be if this column didn't show
    // up at all, as the component it refers to is hidden until we toggle the isForeign radio button to 'true'.
    // Cell 4: Tigers are red and pink. The pink color disappears if we toggle isForeign to 'true', as that's not
    // a valid color for foreign animals.
    assertRow(1, 'Tiger', '', '', 'Rød, Rosa', ['', 'Spam']);

    cy.get('#isForeign').findByRole('radio', { name: 'Ja' }).click();

    // Now the first row gets cleared (and brown still doesn't show up in the color column)
    assertRow(0, 'Katt', '', '', 'Svart', ['', '']);

    // The second row is still there, and still doesn't have legs, but the pink color is gone
    assertRow(1, 'Tiger', '', '', 'Rød', ['', '']);

    // Now we toggle back to 'false' and probably expect the first row to be back
    cy.get('#isForeign').findByRole('radio', { name: 'Nei' }).click();

    // The first row legs are still missing
    assertRow(0, 'Katt', '', '', 'Svart', ['', '']);

    // The second row is still there, and still doesn't have legs (pink is still gone)
    assertRow(1, 'Tiger', '', '', 'Rød', ['', '']);

    // Now we toggle back to 'true' and click the reset button
    cy.get('#isForeign').findByRole('radio', { name: 'Ja' }).click();
    cy.findByRole('button', { name: 'Tilbakestill' }).click();

    // If you set the isForeign radio button to 'true' and then clicked the reset button, we used to get into
    // a situation where (for a short while) the foreign option components were still visible, so they would
    // remove 'stale' values from the incoming data before the 'isForeign' radio button was set to 'false' again by
    // that same incoming data. This has been fixed, so now we expect the first row to have been reset back to its
    // original state.

    assertRow(0, 'Katt', 'fire', '4', 'Svart', ['Criticism', '']);
    assertRow(1, 'Tiger', '', '', 'Rød, Rosa', ['', 'Spam']);

    // A continuation of this test could add a choice for the user to prevent the CustomButton from resetting
    // isForeign back to 'false' when the reset button is clicked. This would allow us to test the case where
    // the foreign option components are still visible when the reset button is clicked.
  });

  it('should not remove stale values prematurely when deleting repeating group rows', () => {
    const allColors = ['Rød', 'Grønn', 'Blå', 'Gul', 'Svart', 'Hvit', 'Brun', 'Oransje', 'Lilla', 'Rosa'];

    cy.gotoHiddenPage('shifting-options');
    cy.findByRole('button', { name: 'Legg til 10 rader' }).click();
    const rows = '[id^="group-balloons-"][id$="-table-body"] tr';
    cy.get(rows).should('have.length', 10);

    function assertRows(...balloonNumbers: number[]) {
      cy.log(`Asserting balloons: ${balloonNumbers.join(', ')}`);
      for (const i in balloonNumbers) {
        const num = balloonNumbers[i];
        cy.get(rows).eq(parseInt(i)).find('td').eq(1).should('have.text', `Ballong ${num} er ${allColors[num]}`);
      }
    }

    assertRows(0, 1, 2, 3, 4, 5, 6, 7, 8, 9);

    cy.get(rows).eq(0).findByRole('button', { name: `Slett-0` }).click();
    cy.waitUntilSaved();

    assertRows(1, 2, 3, 4, 5, 6, 7, 8, 9);
  });

  it('optionsFilter should remove options based on a condition', () => {
    cy.gotoHiddenPage('filtered-options');

    cy.findByRole('checkbox', { name: 'Blåbær' }).dsCheck();
    cy.findByRole('checkbox', { name: 'Druer' }).should('not.exist'); // Filtered out
    cy.findByRole('checkbox', { name: 'Banan' }).should('not.exist'); // Filtered out

    cy.findByRole('button', { name: 'Legg til ny' }).click();

    cy.dsReady('[data-componentid="ingredientType-0"]');
    cy.get('[data-componentid="ingredientType-0"]').findByRole('combobox').click();
    cy.findByRole('option', { name: 'Vannmelon' }).should('exist');
    cy.findByRole('option', { name: 'Blåbær' }).should('not.exist');
    cy.findByRole('option', { name: 'Vannmelon' }).click();
    cy.get('[data-componentid="ingredientId-0"]').should('have.text', '10');

    cy.findByRole('button', { name: 'Legg til ny' }).click();
    cy.dsReady('[data-componentid="ingredientType-1"]');
    cy.get('[data-componentid="ingredientType-1"]').findByRole('combobox').click();
    cy.findByRole('option', { name: 'Banan' }).should('exist');
    cy.findByRole('option', { name: 'Vannmelon' }).should('not.exist');
    cy.findByRole('option', { name: 'Blåbær' }).should('not.exist');
    cy.findByRole('option', { name: 'Banan' }).click();
    cy.get('[data-componentid="ingredientId-1"]').should('have.text', '5');

    // Disliking 'vannmelon' will remove the selection and not allow it to be re-selected
    cy.findByRole('checkbox', { name: 'Vannmelon' }).dsCheck();
    cy.get('[data-componentid="ingredientId-0"]').should('have.text', '');
    cy.get('[data-componentid="ingredientId-1"]').should('have.text', '5');
    cy.get('[data-componentid="ingredientType-0"]').findByRole('combobox').click();
    cy.findByRole('option', { name: 'Vannmelon' }).should('not.exist');
    cy.get('[data-componentid="ingredientType-0"]').type('{esc}');

    // Add two rows with no ingredients selected
    cy.findByRole('button', { name: 'Legg til ny' }).click();
    cy.get('[data-componentid="ingredientType-2"]').should('be.visible');
    cy.findByRole('button', { name: 'Legg til ny' }).click();
    cy.get('[data-componentid="ingredientType-3"]').should('be.visible');
    cy.get('[data-componentid="ingredientType-4"]').should('not.exist');

    cy.changeLayout((comp) => {
      if (comp.type === 'Dropdown' && comp.sortOrder) {
        // At this point grapes are the first option, not yet selected in any of the rows. Using this as a
        // preselected option will cause grapes to be selected for both the rows we
        // just added (and the one where watermelon was removed)
        comp.preselectedOptionIndex = 0;
      }
    });

    // Assert that the grapes are selected in the first row, along with the two last rows we added
    cy.get('[data-componentid="ingredientId-0"]').should('have.text', '1');
    cy.get('[data-componentid="ingredientId-1"]').should('have.text', '5'); // Bananas!
    cy.get('[data-componentid="ingredientId-2"]').should('have.text', '1');
    cy.get('[data-componentid="ingredientId-3"]').should('have.text', '1');

    const errMsg = 'Du kan ikke ha flere ingredienser av samme type';
    cy.get(appFrontend.errorReport).findAllByRole('listitem').should('have.length', 2);
    cy.get(appFrontend.errorReport).findAllByRole('listitem').eq(0).should('contain.text', errMsg);
    cy.get(appFrontend.errorReport).findAllByRole('listitem').eq(1).should('contain.text', errMsg);

    // Select something else than grapes in the third and fourth row
    cy.dsSelect('#ingredientType-2', 'Jordbær');
    cy.dsSelect('#ingredientType-3', 'Mais');

    cy.get(appFrontend.errorReport).should('not.exist');

    // Adding a new row now finds the first available option (spinach)
    cy.findByRole('button', { name: 'Legg til ny' }).click();
    cy.get('[data-componentid="ingredientId-4"]').should('have.text', '3');
  });
});
