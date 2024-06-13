import { AppFrontend } from 'test/e2e/pageobjects/app-frontend';

import type { IRawOption } from 'src/layout/common.generated';

const appFrontend = new AppFrontend();

describe('Options', () => {
  it('is possible to retrieve options dynamically', () => {
    cy.goto('changename');
    // Case: options are dynamically refetched based on what the user selects as source
    cy.get(appFrontend.changeOfName.sources).should('be.visible');

    cy.dsSelect(appFrontend.changeOfName.reference, 'Ola Nordmann');
    cy.get(appFrontend.changeOfName.reference).should('have.value', 'Ola Nordmann');

    //Secure options
    cy.dsSelect(appFrontend.changeOfName.reference2, 'Ole');
    cy.get(appFrontend.changeOfName.reference2).should('have.value', 'Ole');

    // Select a different source, expect previous selection to be cleared and
    // new value to be selectable in the reference option
    cy.dsSelect(appFrontend.changeOfName.sources, 'Digitaliseringsdirektoratet');
    cy.get(appFrontend.changeOfName.reference).and('have.value', '');
    cy.dsSelect(appFrontend.changeOfName.reference, 'Sophie Salt');
    cy.get(appFrontend.changeOfName.reference).should('have.value', 'Sophie Salt');
    cy.dsSelect(appFrontend.changeOfName.reference2, 'Dole');
    cy.get(appFrontend.changeOfName.reference2).should('have.value', 'Dole');
  });

  it('is possible to build options from repeating groups', () => {
    cy.goto('group');
    cy.get(appFrontend.navMenu).should('be.visible');
    cy.get(appFrontend.nextButton).click();
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
    cy.get(appFrontend.nextButton).click();

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
    cy.get(appFrontend.nextButton).click();
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

    cy.get(appFrontend.changeOfName.sources).should('be.visible');

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
    cy.get(appFrontend.changeOfName.summaryReference).should('not.contain.text', 'nordmann');
  });

  it('does not clear options when source changes and the old value is still valid', () => {
    cy.intercept({ method: 'GET', url: '**/options/references*source=digdir' }, (req) => {
      req.reply((res) => {
        const options = res.body as IRawOption[];
        options.push({
          value: 'nordmann',
          label: 'Fortsatt Ola Nordmann',
        });
        res.send(JSON.stringify(options));
      });
    });
    cy.goto('changename');

    cy.get(appFrontend.changeOfName.sources).should('be.visible');

    cy.dsSelect(appFrontend.changeOfName.reference, 'Ola Nordmann');
    cy.get(appFrontend.changeOfName.reference).should('have.value', 'Ola Nordmann');

    cy.dsSelect(appFrontend.changeOfName.sources, 'Digitaliseringsdirektoratet');
    cy.get(appFrontend.changeOfName.sources).should('have.value', 'Digitaliseringsdirektoratet');

    cy.get(appFrontend.changeOfName.reference).should('have.value', 'Fortsatt Ola Nordmann');
  });
});
