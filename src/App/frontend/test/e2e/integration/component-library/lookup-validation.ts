import { AppFrontend } from 'test/e2e/pageobjects/app-frontend';

import type { IDataModelMultiPatchRequest, IDataModelMultiPatchResponse } from 'src/features/formData/types';

const appFrontend = new AppFrontend();
const scenarios = [
  {
    page: 'PersonLookupPage',
    id: 'personLookup',
    type: 'PersonLookup',
    model: 'PersonLookup',
    rows: 'PersonLookups',
    fields: ['Ssn', 'FullName', 'FirstName', 'MiddleName', 'LastName'],
    numberLabel: /Fødselsnummer/i,
    number: '08829698278',
    required: 'Du må fylle ut fødselsnummer',
    invalid: /fødselsnummeret\/d-nummeret er ugyldig/i,
    method: 'POST',
    url: '**/api/v1/lookup/person',
    success: {
      success: true,
      personDetails: {
        ssn: '08829698278',
        name: 'Rik Forelder',
        firstName: 'Rik',
        middleName: '',
        lastName: 'Forelder',
      },
    },
    failure: { success: false, personDetails: null },
  },
  {
    page: 'OrganisationLookupPage',
    id: 'organisationLookup',
    type: 'OrganizationLookup',
    model: 'OrganizationLookup',
    rows: 'OrganizationLookups',
    fields: ['OrgNr', 'Name'],
    numberLabel: /Organisasjonsnummer/i,
    number: '043871668',
    required: 'Du må fylle ut organisasjonsnummer og hente opplysninger',
    invalid: /Organisasjonsnummeret er ugyldig/i,
    method: 'GET',
    url: '**/api/v1/lookup/organisation/*',
    success: { success: true, organisationDetails: { orgNr: '043871668', name: 'Skog og Fjell Consulting' } },
    failure: { success: false, organisationDetails: null },
  },
] as const;

for (const scenario of scenarios) {
  describe(`${scenario.type} validation gates`, () => {
    function start() {
      cy.startAppInstance(appFrontend.apps.componentLibrary, { authenticationLevel: '2' });
      cy.gotoNavPage(scenario.page);
    }

    function fill() {
      cy.findByRole('textbox', { name: scenario.numberLabel }).type(scenario.number);
      if (scenario.type === 'PersonLookup') {
        cy.findByRole('textbox', { name: /Etternavn/i }).type('Forelder');
      }
    }

    function injectBackendErrors(prefix: string) {
      cy.intercept('PATCH', '**/instances/*/*/data*', (req) => {
        const request = req.body as IDataModelMultiPatchRequest;
        req.on('response', (res) => {
          expect(res.statusCode).to.eq(200);
          const response = res.body as IDataModelMultiPatchResponse;
          response.validationIssues.push({
            source: 'LookupTestValidator',
            issues: scenario.fields.map((field) => ({
              source: 'LookupTestValidator',
              field: `${prefix}.${field}`,
              dataElementId: request.patches[0].dataElementId,
              severity: 1,
              customTextKey: `Backend error for ${field}`,
            })),
          });
          res.send(response);
        });
      });
    }

    it('changes required validation using the radio buttons', () => {
      start();
      cy.findByRole('radio', { name: 'Ja' }).should('be.checked');
      cy.get(`[data-componentid="${scenario.id}"]`)
        .findByRole('textbox', { name: scenario.numberLabel })
        .should('have.attr', 'required');
      cy.findByRole('button', { name: 'Neste' }).click();
      cy.get(`[data-componentid="${scenario.id}"]`).findByText(scenario.required).should('be.visible');
      cy.findByRole('radio', { name: 'Nei' }).check();
      cy.get(`[data-componentid="${scenario.id}"]`).findByText(scenario.required).should('not.exist');
      cy.get(`[data-componentid="${scenario.id}"]`)
        .findByRole('textbox', { name: scenario.numberLabel })
        .should('not.have.attr', 'required');
      cy.findByRole('button', { name: 'Neste' }).click();
      cy.get(`[data-componentid="${scenario.id}"]`).should('not.exist');
    });

    it('validates required lookups when saving a row and permits empty optional rows', () => {
      start();
      cy.findByRole('button', { name: /Legg til ny/ }).click();
      cy.get('[data-testid="group-edit-container"]').within(() => {
        cy.findByRole('button', { name: /Lagre og lukk/ }).click();
        cy.findByText(scenario.required).should('be.visible');
        cy.findByRole('textbox', { name: scenario.numberLabel }).should('have.attr', 'aria-invalid', 'true');
      });
      // The row gate must not reveal required errors on the standalone lookup.
      cy.get(`[data-componentid="${scenario.id}"]`).findByText(scenario.required).should('not.exist');
      cy.findByRole('radio', { name: 'Nei' }).check();
      cy.get('[data-testid="group-edit-container"]').within(() => {
        cy.findByText(scenario.required).should('not.exist');
        cy.findByRole('button', { name: /Lagre og lukk/ }).click();
      });
      cy.get('[data-testid="group-edit-container"]').should('not.exist');
    });

    for (const repeated of [false, true]) {
      it(`shows backend errors for every binding after ${repeated ? 'a row' : 'a standalone'} lookup`, () => {
        cy.intercept(scenario.method, scenario.url, scenario.success).as('lookup');
        // The lookup's own gate must reveal errors without showValidations configuration.
        cy.interceptLayout('Task_1', (component) => {
          if (component.type === scenario.type) {
            component.showValidations = [];
          }
        });
        start();
        if (repeated) {
          cy.findByRole('button', { name: /Legg til ny/ }).click();
        }
        injectBackendErrors(repeated ? `${scenario.rows}[0]` : scenario.model);
        const componentId = repeated ? `${scenario.id}-repeated-0` : scenario.id;
        cy.get(`[data-componentid="${componentId}"]`).within(() => {
          fill();
          cy.findByRole('button', { name: /Hent opplysninger/i }).click();
          cy.wait('@lookup');
          for (const field of scenario.fields) {
            cy.findByText(`Backend error for ${field}`).should('be.visible');
          }
          cy.findByRole('textbox', { name: scenario.numberLabel }).should('have.attr', 'aria-invalid', 'true');
          cy.findByRole('button', { name: /Fjern/i }).should('be.visible');
        });
        if (repeated) {
          cy.get('[data-testid="group-edit-container"]').within(() => {
            cy.findByRole('button', { name: /Lagre og lukk/ }).click();
            cy.findByText(`Backend error for ${scenario.fields[0]}`).should('be.visible');
          });
        }
      });
    }

    it('validates optional search inputs at row save and before requesting a lookup', () => {
      cy.intercept(scenario.method, scenario.url, scenario.success).as('lookup');
      cy.interceptLayout('Task_1', (component) => {
        if (component.type === scenario.type) {
          component.showValidations = [];
        }
      });
      start();
      cy.findByRole('radio', { name: 'Nei' }).check();
      cy.findByRole('button', { name: /Legg til ny/ }).click();
      cy.get('[data-testid="group-edit-container"]').within(() => {
        cy.findByRole('button', { name: /Hent opplysninger/i }).click();
        cy.findByText(scenario.invalid, { selector: '[data-validation] span' }).should('be.visible');
        cy.get('@lookup.all').should('have.length', 0);

        cy.findByRole('textbox', { name: scenario.numberLabel }).type('123');
        cy.findByRole('button', { name: /Lagre og lukk/ }).click();
        cy.findByText(scenario.invalid, { selector: '[data-validation] span' }).should('be.visible');
        cy.findByRole('textbox', { name: scenario.numberLabel }).should('have.attr', 'aria-invalid', 'true');
        cy.findByRole('button', { name: /Hent opplysninger/i }).click();
        cy.get('@lookup.all').should('have.length', 0);

        cy.findByRole('textbox', { name: scenario.numberLabel }).numberFormatClear();
        fill();
        cy.findByText(scenario.invalid, { selector: '[data-validation] span' }).should('not.exist');
        cy.findByRole('button', { name: /Hent opplysninger/i }).click();
        cy.wait('@lookup');
        cy.findByRole('button', { name: /Fjern/i }).should('be.visible');
        cy.findByRole('button', { name: /Lagre og lukk/ }).click();
      });
      cy.get('[data-testid="group-edit-container"]').should('not.exist');
      cy.get('@lookup.all').should('have.length', 1);
    });

    it('keeps pending lookup errors with their row when an earlier row is deleted', () => {
      cy.intercept(scenario.method, scenario.url, scenario.failure).as('lookup');
      start();
      cy.findByRole('radio', { name: 'Nei' }).check();
      cy.findByRole('button', { name: /Legg til ny/ }).click();
      cy.get('[data-testid="group-edit-container"]').within(() => {
        cy.findByRole('button', { name: /Lagre og lukk/ }).click();
      });
      cy.findByRole('button', { name: /Legg til ny/ }).click();
      cy.get('[data-testid="group-edit-container"]').within(() => {
        fill();
        cy.findByRole('button', { name: /Hent opplysninger/i }).click();
        cy.wait('@lookup');
        cy.findByText(/ikke funnet|Ingen person er registrert/i, { selector: '[data-validation] span' }).should(
          'be.visible',
        );
      });

      cy.get(`#group-${scenario.id}-group-table-body > tr[data-row-num="0"]`)
        .findByRole('button', { name: /Slett/ })
        .click();
      cy.get(`[data-componentid="${scenario.id}-repeated-0"]`).within(() => {
        cy.findByRole('textbox', { name: scenario.numberLabel }).should('have.value', scenario.number);
        cy.findByText(/ikke funnet|Ingen person er registrert/i, { selector: '[data-validation] span' }).should(
          'be.visible',
        );
      });

      cy.get(`[data-componentid="${scenario.id}-group"]`).findByRole('button', { name: /Slett/ }).click();
      cy.get('[data-testid="group-edit-container"]').should('not.exist');
      cy.findByRole('button', { name: /Legg til ny/ }).click();
      cy.get('[data-testid="group-edit-container"]').within(() => {
        cy.findByRole('textbox', { name: scenario.numberLabel }).should('have.value', '');
        cy.findByText(/ikke funnet|Ingen person er registrert/i, { selector: '[data-validation] span' }).should(
          'not.exist',
        );
        cy.findByRole('button', { name: /Lagre og lukk/ }).click();
      });
      cy.get('[data-testid="group-edit-container"]').should('not.exist');
      cy.get('@lookup.all').should('have.length', 1);
    });

    it('prevents saving a failed optional lookup', () => {
      cy.intercept(scenario.method, scenario.url, scenario.failure).as('lookup');
      start();
      cy.findByRole('radio', { name: 'Nei' }).check();
      cy.findByRole('button', { name: /Legg til ny/ }).click();
      cy.get('[data-testid="group-edit-container"]').within(() => {
        fill();
        cy.findByRole('button', { name: /Hent opplysninger/i }).click();
        cy.wait('@lookup');
        cy.findByRole('button', { name: /Lagre og lukk/ }).click();
        cy.findByRole('button', { name: /Hent opplysninger/i }).should('be.visible');
      });
    });
  });
}
