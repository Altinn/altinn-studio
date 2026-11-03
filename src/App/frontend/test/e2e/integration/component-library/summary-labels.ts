import { AppFrontend } from 'test/e2e/pageobjects/app-frontend';

const appFrontend = new AppFrontend();

const examples = [
  {
    page: 'Kort svar',
    id: 'InputPage-Input',
    description: 'Beskrivelse av kort svar i oppsummeringen',
    help: 'Hjelp til kort svar',
  },
  {
    page: 'Grid',
    id: 'all-grid-components',
    description: 'Hello this is a description of the component below',
    help: 'Hjelp til utfylling av tabellen',
  },
  {
    page: 'PersonLookupPage',
    id: 'personLookup',
    description: 'Her legger du inn etternavn og fødselsnummer',
    help: 'For å kunne søke i registeret må du ha fødselsnummeret til personen',
  },
  {
    page: 'OrganisationLookupPage',
    id: 'organisationLookup',
    description: 'Her legger du inn organisasjonsnummer',
    help: 'Du kan finne organisasjonsnummeret ved å søke i Brønnøysundregistrene',
  },
  {
    page: 'SimpleTable',
    id: 'Table1',
    description: 'Tabellen viser registrerte oppføringer',
    help: 'Velg en oppføring for å se detaljene',
  },
  {
    page: 'Repeterende gruppe',
    id: 'RepeatingGroup',
    description: 'Beskrivelse av repeterende gruppe',
    help: 'Hjelp til repeterende gruppe',
  },
];

describe('Specialized Summary2 labels', () => {
  it('shows configured descriptions and help on specialized summaries', () => {
    cy.startAppInstance(appFrontend.apps.componentLibrary, { authenticationLevel: '2' });

    for (const { page, id, description, help } of examples) {
      cy.gotoNavPage(page);
      if (id === 'InputPage-Input') {
        cy.get('#InputPage-Input').type('Ada');
      }
      if (id === 'RepeatingGroup') {
        cy.findAllByRole('button', { name: /Legg til ny/ })
          .first()
          .click();
        cy.findByRole('textbox', { name: /Navn/ }).type('Ada');
        cy.findAllByRole('button', { name: /Lagre og lukk/ })
          .first()
          .click();
      }

      const summary =
        id === 'RepeatingGroup' ? '[data-componentid="RepeatingGroup-Summary2"]' : `[data-summary-target="${id}"]`;
      cy.get(summary)
        .first()
        .within(() => {
          cy.contains(description).should('be.visible');
          cy.get('button[aria-label^="Hjelpetekst for"]').first().click();
          cy.findAllByTestId('helptext').filter(':visible').should('contain.text', help);
          cy.get('button[aria-label^="Hjelpetekst for"]').first().click();

          if (id === 'all-grid-components') {
            cy.findAllByRole('heading', { name: 'My grid component', level: 4 }).should('have.length', 1);
          }

          if (id === 'InputPage-Input') {
            cy.get('button[aria-label^="Hjelpetekst for"]').first().focus();
            cy.press('Tab');
            cy.findByRole('button', { name: /^Endre/ }).should('be.focused');
            cy.root().should(($summary) => {
              const label = $summary.find('.ds-label')[0];
              const value = $summary
                .find('span')
                .filter((_, element) => element.textContent?.trim() === 'Ada')
                .last()[0];
              expect(value, 'summary value').to.exist;
              expect(value.getBoundingClientRect().top, 'compact value beside label').to.be.closeTo(
                label.getBoundingClientRect().top,
                6,
              );
            });
          }

          if (id === 'RepeatingGroup') {
            cy.contains('Beskrivelse av navn').should('be.visible');
            cy.get('button[aria-label="Hjelpetekst for Navn"]').click();
            cy.findAllByTestId('helptext').filter(':visible').should('contain.text', 'Hjelp til navn');
          }
        });
    }
  });
});
