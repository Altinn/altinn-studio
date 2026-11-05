import type { CompRepeatingGroupExternal } from '@app/layout-contract/generated/components/RepeatingGroup/config.generated';

import { AppFrontend } from 'test/e2e/pageobjects/app-frontend';
import { interceptAltinnAppGlobalData } from 'test/e2e/support/intercept-global-data';

import type { FormBootstrapResponse } from 'src/features/formBootstrap/types';
import type { ValidationSeverity } from 'src/features/validation';
import type { CompExternal } from 'src/layout/layout';

const appFrontend = new AppFrontend();
const groupField = 'Endringsmelding-grp-9786.OversiktOverEndringene-grp-9788';
const valueField = 'SkattemeldingEndringEtterFristOpprinneligBelop-datadef-37131';
const nestedField = 'nested-grp-1234';
const commentField = 'SkattemeldingEndringEtterFristKommentar-datadef-37133';
const model = 'nested-group';
const indicator = '[data-testid="row-validation-indicator"]';
const row = (index: number) => `#group-validationGroup-table-body > tr[data-row-num="${index}"]`;

function setup({
  edit = {},
  nested = false,
  deferred = false,
}: {
  edit?: CompRepeatingGroupExternal['edit'];
  nested?: boolean;
  deferred?: boolean;
} = {}) {
  interceptAltinnAppGlobalData((data) => {
    data.textResources?.resources.push({
      id: 'row.warning',
      value: 'Kontroller beløpet {0}. [Les mer](https://www.altinn.no/)',
      variables: [{ key: 'amount', dataSource: 'customTextParameters' }],
    });
    data.textResources?.resources.push({
      id: 'row.nested',
      value: 'Kontroller: {0}',
      variables: [
        { key: `${groupField}[{0}].${nestedField}[{1}].${commentField}.value`, dataSource: `dataModel.${model}` },
      ],
    });
  });
  const initialData = {
    'Endringsmelding-grp-9786': {
      'OversiktOverEndringene-grp-9788': [400, 300, 200, 100, 0].map((value, index) => ({
        altinnRowId: `00000000-0000-4000-8000-00000000000${index}`,
        [valueField]: { value },
        [commentField]: { value: '' },
        [nestedField]: [
          {
            altinnRowId: `00000000-0000-4000-8001-00000000000${index}`,
            [commentField]: { value: 'Første kommentar' },
          },
          {
            altinnRowId: `00000000-0000-4000-8002-00000000000${index}`,
            [commentField]: { value: 'Andre kommentar' },
          },
        ],
      })),
    },
  };
  cy.intercept('GET', '**/bootstrap-form/Task_3**').as('originalBootstrap');
  cy.goto('group');
  cy.wait('@originalBootstrap').then(({ request, response }) => {
    const bootstrap: FormBootstrapResponse = response!.body;
    cy.getCookie('XSRF-TOKEN').then((token) => {
      cy.request({
        method: 'PUT',
        url: `${request.url.split('/bootstrap-form/')[0]}/data/${bootstrap.dataModels[model].dataElementId}`,
        headers: { 'X-XSRF-TOKEN': token?.value },
        body: initialData,
      });
    });
  });
  cy.intercept('GET', '**/bootstrap-form/Task_3**', (req) => {
    req.on('response', (res) => {
      const body: FormBootstrapResponse = res.body;
      const binding = (field: string) => ({ dataType: model, field });
      const components: CompExternal[] = [
        { id: 'validationNav', type: 'NavigationBar' },
        {
          id: 'validationGroup',
          type: 'RepeatingGroup',
          maxCount: 10,
          dataModelBindings: { group: binding(groupField) },
          children: nested ? ['0:validationValue', '1:validationNested'] : ['validationValue'],
          tableHeaders: ['validationValue'],
          textResourceBindings: {
            title: 'Endringer i beløp',
            editButtonOpen: 'Se og endre',
            editButtonClose: 'Lukk raden',
          },
          edit: { mode: 'showTable', multiPage: nested, ...edit },
        },
        {
          id: 'validationValue',
          type: 'Input',
          dataModelBindings: { simpleBinding: binding(`${groupField}.${deferred ? commentField : valueField}.value`) },
          textResourceBindings: { title: 'Opprinnelig beløp' },
          required: deferred,
          showValidations: deferred ? [] : ['All'],
        },
        {
          id: 'validationNext',
          type: 'NavigationButtons',
          validateOnNext: { page: 'current', show: ['All'] },
        },
      ];
      if (nested) {
        components.push(
          {
            id: 'validationNested',
            type: 'RepeatingGroup',
            maxCount: 10,
            dataModelBindings: { group: binding(`${groupField}.${nestedField}`) },
            children: ['validationComment'],
            tableHeaders: ['validationComment'],
            textResourceBindings: { title: 'Kommentarer' },
          },
          {
            id: 'validationComment',
            type: 'Input',
            dataModelBindings: { simpleBinding: binding(`${groupField}.${nestedField}.${commentField}.value`) },
            textResourceBindings: { title: 'Kommentar' },
            showValidations: ['All'],
          },
        );
      }
      for (const [index, layout] of Object.values(body.layouts).entries()) {
        layout.data.layout = [{ id: `validationNavPage${index}`, type: 'NavigationBar' }];
      }
      body.layouts.repeating.data.layout = components;
      body.dataModels[model].expressionValidationConfig = null;
      const dataElementId = body.dataModels[model].dataElementId!;
      const messages: { severity: 1 | 2 | 3 | 5; index: number; description: string }[] = nested
        ? [{ severity: 2, index: 1, description: 'Kontroller den andre kommentaren' }]
        : [
            { severity: 1, index: 0, description: 'Beløpet må korrigeres' },
            { severity: 2, index: 0, description: 'Kontroller beløpet' },
            { severity: 2, index: 1, description: 'Kontroller beløpet' },
            { severity: 3, index: 2, description: 'Beløpet er hentet fra forrige år' },
            { severity: 5, index: 3, description: 'Beløpet er bekreftet' },
          ];
      body.dataModels[model].initialValidationIssues = deferred
        ? []
        : messages.map(({ index, severity, description }) => ({
            dataElementId,
            severity,
            description,
            source: 'RowValidationTest',
            field: nested
              ? `${groupField}[${index}].${nestedField}[1].${commentField}.value`
              : `${groupField}[${index}].${valueField}.value`,
            ...(nested ? { customTextKey: 'row.nested' } : {}),
            ...(severity === 2 && !nested
              ? { customTextKey: 'row.warning', customTextParameters: { amount: index === 0 ? '400' : '300' } }
              : {}),
          }));
      res.send(body);
    });
  });
  cy.reload();
  cy.waitForLoad();
  cy.gotoNavPage('repeating');
}

function checkIndicator(index: number, severity: ValidationSeverity) {
  const colors = { error: 'danger', warning: 'warning', info: 'info', success: 'success' };
  cy.get(row(index)).find(indicator).should('be.visible').and('have.attr', 'data-color', colors[severity]);
}

describe('Repeating group row validation', () => {
  it('keeps configured labels and exposes all messages with their links and parameters', () => {
    setup();
    checkIndicator(0, 'error');
    checkIndicator(1, 'warning');
    checkIndicator(2, 'info');
    checkIndicator(3, 'success');
    cy.get(row(4)).find(indicator).should('not.exist');
    cy.get(row(0)).findByRole('button', { name: 'Se og endre 400' }).should('be.visible');
    cy.get('#group-validationGroup').screenshot('row-validation-desktop');

    cy.get(row(0)).find(indicator).click();
    cy.findByRole('dialog', { name: 'Meldinger' }).as('messages').should('be.focused');
    cy.get('@messages').findAllByRole('listitem').should('have.length', 2);
    cy.get('@messages').should('contain.text', 'Beløpet må korrigeres').and('contain.text', 'Kontroller beløpet 400.');
    cy.get('@messages').findByRole('link', { name: 'Les mer' }).should('have.attr', 'href', 'https://www.altinn.no/');
    cy.injectAxe();
    cy.checkA11y('[data-testid="row-validation-messages"]:popover-open');
    cy.screenshot('row-validation-popover', { capture: 'viewport' });
    cy.get('@messages').type('{esc}');
    cy.get(row(0)).find(indicator).should('have.focus').and('have.attr', 'aria-expanded', 'false');

    cy.press('Space');
    cy.findByRole('dialog', { name: 'Meldinger' }).should('have.focus');
    cy.press('Tab');
    cy.focused().should('have.attr', 'aria-label', 'Lukk');
    cy.press('Space');
    cy.get(row(0)).find(indicator).should('have.focus').and('have.attr', 'aria-expanded', 'false');
    cy.press('Space');
    cy.findByRole('dialog', { name: 'Meldinger' })
      .findAllByRole('button', { name: 'Opprinnelig beløp' })
      .first()
      .click();
    cy.get('#validationValue-0').should('have.focus');
    cy.get(row(0)).find(indicator).should('have.attr', 'aria-expanded', 'false');
    cy.get(row(0)).findByRole('button', { name: 'Lukk raden 400' }).should('be.visible');
    cy.get('#validationValue-0').closest('[data-componentid]').should('contain.text', 'Beløpet må korrigeres');
    cy.get(appFrontend.errorReport).should('not.exist');
    for (const index of [1, 2, 3]) {
      cy.get(row(index)).find(indicator).click({ scrollBehavior: 'center' });
      cy.get(row(index)).find(indicator).should('be.inViewport');
      cy.findByRole('dialog', { name: 'Meldinger' }).should('be.inViewport');
      cy.findByRole('dialog', { name: 'Meldinger' }).findByRole('button', { name: 'Opprinnelig beløp' }).click();
      cy.get(`#validationValue-${index}`).should('have.focus');
      cy.get(row(index)).find(indicator).should('have.attr', 'aria-expanded', 'false');
    }
    cy.findByRole('button', { name: /Neste/ }).last().click();
    cy.get(appFrontend.errorReport)
      .should('contain.text', 'Beløpet må korrigeres')
      .and('not.contain.text', 'Kontroller beløpet');
  });

  it('opens a nested field on the right internal page and preserves nested row context', () => {
    setup({ nested: true });
    cy.get(row(0)).find(indicator).should('not.exist');
    checkIndicator(1, 'warning');
    cy.get(row(1)).find(indicator).click();
    cy.findByRole('dialog', { name: 'Meldinger' }).should('contain.text', 'Kontroller: Andre kommentar');
    cy.findByRole('dialog', { name: 'Meldinger' }).findByRole('button', { name: 'Kommentar (Rad 2 / Rad 2)' }).click();
    cy.get('#validationComment-1-1').should('be.visible').and('have.focus');
    cy.get('#group-validationNested-1-table-body > tr[data-row-num="1"]').find(indicator).should('be.visible');
    cy.get(row(1)).find(indicator).should('have.attr', 'aria-expanded', 'false');
  });

  for (const mode of ['onlyTable', 'hidden-actions', 'compact-vertical-mobile'] as const) {
    it(`keeps indicators available in ${mode}`, () => {
      const mobile = mode === 'compact-vertical-mobile';
      setup({
        edit:
          mode === 'onlyTable'
            ? { mode: 'onlyTable', deleteButton: false }
            : mode === 'hidden-actions'
              ? { editButton: false, deleteButton: false }
              : { compactButtons: true, buttonLayout: 'vertical' },
      });
      if (mobile) {
        cy.viewport(390, 844);
      }
      checkIndicator(0, 'error');
      checkIndicator(1, 'warning');
      if (mode === 'onlyTable') {
        cy.get('#group-validationGroup').screenshot('row-validation-editable-table');
      }
      if (mobile) {
        cy.get('#group-validationGroup').scrollIntoView();
        cy.screenshot('row-validation-mobile-rows', { capture: 'viewport' });
      }
      cy.get(row(0)).find(indicator).click();
      cy.findByRole('dialog', { name: 'Meldinger' }).should('be.visible');
      if (mobile) {
        cy.screenshot('row-validation-mobile', { capture: 'viewport' });
      }
      cy.findByRole('dialog', { name: 'Meldinger' })
        .findAllByRole('button', { name: 'Opprinnelig beløp' })
        .first()
        .click();
      cy.get(row(0)).find(indicator).should('have.attr', 'aria-expanded', 'false');
      if (mode !== 'hidden-actions') {
        cy.get('#validationValue-0').should('have.focus');
      }
      if (mode === 'onlyTable') {
        cy.get('#group-validationGroup').findByTestId('repeating-group-edit-button').should('not.exist');
      }
    });
  }

  it('does not reveal deferred validations until existing visibility rules reveal them', () => {
    setup({ deferred: true });
    cy.get('#group-validationGroup').find(indicator).should('not.exist');
    cy.findByRole('button', { name: /Neste/ }).last().click();
    checkIndicator(0, 'error');
    cy.get(appFrontend.errorReport).should('contain.text', 'opprinnelig beløp');
    cy.changeLayout((component) => {
      if (component.id === 'validationValue') {
        component.hidden = true;
      }
    });
    cy.get('#group-validationGroup').find(indicator).should('not.exist');
  });
});
