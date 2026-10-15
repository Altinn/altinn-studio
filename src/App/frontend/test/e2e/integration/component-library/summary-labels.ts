import { AppFrontend } from 'test/e2e/pageobjects/app-frontend';

const appFrontend = new AppFrontend();
const examples = [
  { page: 'Grid', id: 'all-grid-components' },
  { page: 'PersonLookupPage', id: 'personLookup' },
  { page: 'OrganisationLookupPage', id: 'organisationLookup' },
  { page: 'Adresse', id: 'AddressPage-Address' },
  { page: 'SimpleTable', id: 'Table1' },
  { page: 'Repeterende gruppe', id: 'RepeatingGroup' },
];

describe('Specialized Summary2 labels', () => {
  for (const { page, id } of examples) {
    it(`shows description and help once per summary of ${id}`, () => {
      const title = `Oppsummering av ${id}`;
      const description = `Beskrivelse for ${id}`;
      const help = `Hjelp for ${id}`;
      cy.interceptLayout('Task_1', (component) => {
        if (component.id === id) {
          component.textResourceBindings = { ...component.textResourceBindings, title, description, help };
        }
        if (id === 'RepeatingGroup' && component.id === 'RepeatingGroup-Input-Name') {
          component.textResourceBindings = {
            ...component.textResourceBindings,
            description: 'Beskrivelse av navn',
            help: 'Hjelp til navn',
          };
        }
        if (component.type === 'Summary2') {
          component.hideEmptyFields = false;
        }
      });
      cy.startAppInstance(appFrontend.apps.componentLibrary, { authenticationLevel: '2' });
      cy.gotoNavPage(page);
      if (id === 'RepeatingGroup') {
        cy.findAllByRole('button', { name: /Legg til ny/ })
          .first()
          .click();
        cy.findByRole('textbox', { name: /Navn/ }).type('Ada');
        cy.findAllByRole('button', { name: /Lagre og lukk/ })
          .first()
          .click();
      }
      cy.get(`[data-summary-target="${id}"]`).each(($summary) => {
        cy.wrap($summary).within(() => {
          if (id === 'RepeatingGroup') {
            cy.findByText('Beskrivelse av navn', { exact: true }).should('be.visible');
            cy.findByRole('button', { name: 'Hjelpetekst for Navn' }).click();
            cy.findAllByTestId('helptext')
              .filter(':visible')
              .should('have.length', 1)
              .and('contain.text', 'Hjelp til navn')
              .and('be.visible');
            cy.findByRole('button', { name: 'Hjelpetekst for Navn' }).click();
          }
          cy.findByText(description, { exact: true }).should('be.visible');
          cy.findByRole('button', { name: `Hjelpetekst for ${title}` }).click();
          cy.findAllByTestId('helptext')
            .filter(':visible')
            .should('have.length', 1)
            .and('contain.text', help)
            .and('be.visible');
        });
      });
    });
  }
});
