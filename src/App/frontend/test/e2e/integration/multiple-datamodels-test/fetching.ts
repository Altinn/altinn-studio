import { AppFrontend } from 'test/e2e/pageobjects/app-frontend';

import type { IRawDataModelBinding } from 'src/layout/common.generated';

const appFrontend = new AppFrontend();

describe('fetching new data from models', () => {
  /**
   * Reproduction and regression test for https://github.com/Altinn/app-frontend-react/issues/3634
   *
   * This bug relies on the following structure:
   *  - A data model is created in Task_1, but there is no data in it
   *  - A text resource (not a component!) references this data model, so it will be fetched in FormDataReaders in Task_1
   *  - A backend IProcessTaskEnd handler updates the data model when ending Task_1
   *  - When Task_2 starts, frontend doesn't notice that the data model it had in query cache was outdated, so it
   *    fails to load it (again), thus getting stuck with the outdated data as initial data in FormDataWrite.
   */
  it('should have fetched new data when entering Task_2', () => {
    cy.startAppInstance(appFrontend.apps.multipleDatamodelsTest);
    cy.findByRole('textbox', { name: /tekstfelt 1/i }).type('første');
    cy.findByRole('textbox', { name: /tekstfelt 2/i }).type('andre');

    cy.gotoNavPage('Side3');

    cy.findByRole('button', { name: /legg til ny/i }).click();
    cy.findByRole('textbox', { name: /fornavn/i }).type('Per');
    cy.findByRole('textbox', { name: /etternavn/i }).type('Hansen');
    cy.findAllByRole('button', { name: /lagre og lukk/i })
      .first()
      .click();

    cy.changeLayout((component) => {
      for (const _dmb of Object.values(component.dataModelBindings ?? {})) {
        const binding = _dmb as IRawDataModelBinding;
        if (typeof binding === 'object' && binding.dataType === 'sharedperson') {
          // If any component starts referencing this data model, the reproduction breaks. This bug specifically relied
          // on this data model only being references via a text resource in Task_1.
          throw new Error('Found sharedperson data model binding in Task_1');
        }
      }
    });

    cy.gotoNavPage('Side6');
    cy.findByRole('radio', { name: /kåre/i }).dsCheck();
    cy.waitUntilSaved();
    cy.findByText(/Du må rette disse feilene før du kan gå videre/i).should('not.exist');

    cy.intercept('GET', '**/data/**', (req) => {
      req.reply((res) => {
        if (res.body.name === 'Ola Nordmann') {
          // Delaying the response for this data model specifically. When reproducing this bug, it relied on the query
          // cache for an earlier request to this data model, so if the request ends before the other data models are
          // fetched it might cover the underlying bug.
          res.setDelay(500);
        }
      });
    }).as('fetchData');

    cy.findByRole('button', { name: /send inn/i }).click();

    cy.findByRole('heading', { name: /fra forrige steg/i }).should('be.visible');
    cy.findByText(/Du må rette disse feilene før du kan gå videre/i).should('not.exist');
    cy.findByRole('button', { name: 'Neste' }).click();

    // If the bug regresses, these fields will be empty
    cy.findByRole('textbox', { name: 'Navn' }).should('have.value', 'Ola Nordmann');
    cy.findByRole('textbox', { name: 'Adresse' }).should('have.value', 'Testveien 123');
    cy.findByRole('textbox', { name: 'Postnr' }).should('have.value', '4609');
    cy.findByRole('textbox', { name: 'Poststed' }).should('have.value', 'Kardemomme By');
    cy.waitUntilSaved();
  });
});
