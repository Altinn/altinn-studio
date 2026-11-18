import { AppFrontend } from 'test/e2e/pageobjects/app-frontend';

import type { IDataModelMultiPatchResponse } from 'src/features/formData/types';

const appFrontend = new AppFrontend();
const variants = ['default', 'mixed', 'table'] as const;
const indicator = '[data-testid="row-validation-indicator"]';
const rowPanel = '[data-testid="table-row-validation-messages"]';
const rowMessage = 'Denne meldingen gjelder opplysningene om kjæledyret samlet.';
const row = (variant: string, index = 0) => `#group-validation-${variant}-table-body > tr[data-row-num="${index}"]`;

function setup() {
  cy.viewport(1440, 1000);
  cy.goto('group');
  cy.gotoNavPage('Validering i grupper');
  cy.findByRole('button', { name: 'Last eksempeldata' }).click();
  cy.get('#group-validation-default-table-body > tr[data-row-num]').should('have.length', 7);
  cy.waitUntilSaved();
  cy.changeLayout((component) => {
    if (
      component.id.startsWith('validation-') &&
      (component.type === 'RepeatingGroup' || component.type === 'Input' || component.type === 'Dropdown')
    ) {
      component.showValidations = [];
    }
  });
  cy.findByRole('checkbox', { name: 'På feltene' }).uncheck();
  cy.findByRole('checkbox', { name: 'På raden samlet' }).check();
  cy.waitUntilSaved();
}

describe('Repeating group array and row-object validations', () => {
  it('uses real backend targets and reveals array, row and field validations independently', () => {
    setup();
    cy.get(indicator).should('not.exist');
    cy.get(rowPanel).should('not.exist');
    cy.intercept('PATCH', '**/data?language=*').as('arrayAndRowValidation');
    cy.findByRole('checkbox', { name: 'På hele gruppen' }).check();
    cy.wait('@arrayAndRowValidation').then(({ response }) => {
      const body: IDataModelMultiPatchResponse = response!.body;
      const issues = body.validationIssues.flatMap((source) => source.issues);
      const arrays = issues.filter((issue) => issue.field === 'Pets');
      const rows = issues.filter((issue) => /^Pets\[\d+]$/.test(issue.field ?? ''));
      expect(arrays, 'one issue of each severity for the actual array').to.have.length(4);
      expect(rows, 'one issue for each non-empty example row').to.have.length(6);
      expect([...arrays, ...rows].every((issue) => !issue.componentId)).to.equal(true);
    });
    cy.waitUntilSaved();
    cy.get(indicator).should('not.exist');
    cy.changeLayout((component) => {
      if (component.type === 'RepeatingGroup' && component.id.startsWith('validation-')) {
        component.showValidations = ['CustomBackend'];
      }
    });
    for (const variant of variants) {
      cy.get(row(variant, 0)).find(indicator).should('have.attr', 'data-color', 'danger');
      cy.get(row(variant, 1)).find(indicator).should('have.attr', 'data-color', 'warning');
      if (variant === 'default') {
        cy.get(`#group-validation-${variant} ${rowPanel}`).should('not.exist');
      } else {
        cy.get(`#group-validation-${variant} ${rowPanel}`).should('have.length', 6);
      }
      cy.get(row(variant, 5)).find(indicator).should('not.exist');
      cy.get(`#group-validation-${variant} ${rowPanel}[data-for-row="5"]`).should('not.exist');
      cy.get(`[data-componentid="validation-${variant}"]`).should(
        'contain.text',
        'Kontroller kjæledyrene i denne gruppen samlet.',
      );
    }
    cy.get('[data-testid="table-field-validation-indicator"]').should('not.exist');
    cy.findByRole('checkbox', { name: 'På feltene' }).check();
    cy.waitUntilSaved();
    cy.get('[data-testid="table-field-validation-indicator"]').should('not.exist');
    cy.findByRole('button', { name: /Neste/ }).click();
    cy.navPage('Validering i grupper').should('have.attr', 'aria-current', 'page');
    cy.get(row('table', 0)).find('[data-testid="table-field-validation-indicator"]').should('have.length', 1);
    cy.get(row('table', 0)).next().find('td > ul').should('have.length', 1).children('li').should('have.length', 2);
    cy.get(row('table', 0)).next().should('contain.text', rowMessage).and('contain.text', 'Navnet stemmer ikke');
    cy.get(row('table', 4)).next().children('td').should('have.length', 1).and('have.attr', 'colspan', '4');
    cy.get(row('table', 4)).next().find('td > ul').should('have.length', 1).children('li').should('have.length', 3);
    cy.get(row('table', 4))
      .next()
      .should('contain.text', rowMessage)
      .and('contain.text', 'Oppgi navnet slik')
      .and('contain.text', 'Alderen er høyere');
    cy.get(appFrontend.errorReport).should('contain.text', rowMessage);
    cy.viewport(390, 844);
    cy.get(`#group-validation-table ${rowPanel}`).first().find('td').should('have.attr', 'colspan', '2');
  });

  it('reveals and blocks only the saved row, placing object messages before the expanded editor', () => {
    setup();
    cy.changeLayout((component) => {
      if (component.id === 'validation-mixed' && component.type === 'RepeatingGroup') {
        component.validateOnSaveRow = ['CustomBackend'];
      }
    });
    cy.get(row('mixed', 0)).findByTestId('repeating-group-edit-button').click();
    cy.get('#group-validation-mixed')
      .find(appFrontend.group.editContainer)
      .findByRole('button', { name: 'Lagre og lukk' })
      .click();
    cy.get('#validation-mixed-species-0').should('be.visible');
    for (const variant of variants) {
      cy.get(row(variant, 0)).find(indicator).should('have.attr', 'data-color', 'danger');
      cy.get(row(variant, 1)).find(indicator).should('not.exist');
      if (variant === 'default') {
        cy.get(`#group-validation-${variant} ${rowPanel}`).should('not.exist');
      } else {
        cy.get(`#group-validation-${variant} ${rowPanel}`).should('have.length', 1);
      }
    }
    cy.get(row('mixed', 0))
      .next()
      .should('have.attr', 'data-testid', 'table-row-validation-messages')
      .and('contain.text', rowMessage);
    cy.get(row('mixed', 0)).next().next().find(appFrontend.group.editContainer).should('be.visible');
    cy.get(row('mixed', 0)).find(indicator).click();
    cy.findByRole('dialog', { name: 'Meldinger' }).findAllByRole('listitem').should('have.length', 1);
    cy.findByRole('dialog', { name: 'Meldinger' }).should('contain.text', rowMessage).type('{esc}');
    cy.findByRole('checkbox', { name: 'På feltene' }).check();
    cy.waitUntilSaved();
    cy.get(row('mixed', 0)).next().should('have.attr', 'data-testid', 'table-row-validation-messages');
    cy.get(row('mixed', 0)).next().find('td > ul').should('have.length', 1).children('li').should('have.length', 2);
    cy.get(row('mixed', 0)).next().should('contain.text', rowMessage).and('contain.text', 'Navnet stemmer ikke');
    cy.get(row('mixed', 0)).next().next().find(appFrontend.group.editContainer).should('be.visible');
    cy.viewport(390, 844);
    cy.get(row('mixed', 0)).next().find('td').should('have.attr', 'colspan', '2');
    cy.get(row('mixed', 0)).next().next().find(appFrontend.group.editContainer).should('be.visible');
    cy.get(row('mixed', 0)).next().find('td > ul > li').should('have.length', 1);
    cy.get(row('mixed', 0)).next().should('contain.text', rowMessage).and('not.contain.text', 'Navnet stemmer ikke');
    cy.viewport(320, 844);
    cy.get(row('mixed', 0))
      .find('button')
      .should(($buttons) => {
        for (const button of $buttons) {
          const bounds = button.getBoundingClientRect();
          expect(bounds.left, 'row action stays inside narrow viewport').to.be.at.least(0);
          expect(bounds.right, 'row action stays inside narrow viewport').to.be.at.most(320);
        }
      });
    cy.get(row('mixed', 0)).find(indicator).click();
    cy.findByRole('dialog', { name: 'Meldinger' }).should(($dialog) => {
      const bounds = $dialog[0].getBoundingClientRect();
      expect(bounds.left).to.be.at.least(0);
      expect(bounds.right).to.be.at.most(320);
    });
  });

  it('includes real row-object errors in Next validation and suppresses hidden rows', () => {
    setup();
    cy.findByRole('button', { name: /Neste/ }).click();
    cy.navPage('Validering i grupper').should('have.attr', 'aria-current', 'page');
    cy.get(appFrontend.errorReport).should('contain.text', rowMessage);
    cy.get(`#group-validation-table ${rowPanel}`).should('have.length', 6);
    cy.changeLayout((component) => {
      if (component.id === 'validation-table' && component.type === 'RepeatingGroup') {
        component.hiddenRow = ['equals', ['dataModel', 'Pets.Name'], 'Balder'];
      }
    });
    cy.get(row('table', 0)).should('not.exist');
    cy.get(`#group-validation-table ${rowPanel}[data-for-row="0"]`).should('not.exist');
    cy.get(`#group-validation-table ${rowPanel}[data-for-row="1"]`).should('be.visible');
  });
});
