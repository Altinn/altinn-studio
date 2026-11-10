import { AppFrontend } from 'test/e2e/pageobjects/app-frontend';
import { interceptAltinnAppGlobalData } from 'test/e2e/support/intercept-global-data';

import type { FormBootstrapResponse } from 'src/features/formBootstrap/types';
import type { CompExternal } from 'src/layout/layout';

const appFrontend = new AppFrontend();
const groupField = 'Endringsmelding-grp-9786.OversiktOverEndringene-grp-9788';
const valueField = 'SkattemeldingEndringEtterFristOpprinneligBelop-datadef-37131';
const nestedField = 'nested-grp-1234';
const commentField = 'SkattemeldingEndringEtterFristKommentar-datadef-37133';
const model = 'nested-group';
const indicator = '[data-testid="row-validation-indicator"]';
const row = (index: number) => `#group-validationGroup-table-body > tr[data-row-num="${index}"]`;

function setup(nested: boolean) {
  const deferred = !nested;
  interceptAltinnAppGlobalData((data) => {
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
      'OversiktOverEndringene-grp-9788': [400, 300].map((value, index) => ({
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
          },
          edit: { mode: 'showTable', multiPage: nested },
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
      body.dataModels[model].initialValidationIssues = nested
        ? [
            {
              dataElementId,
              severity: 2,
              description: 'Kontroller den andre kommentaren',
              source: 'RowValidationTest',
              field: `${groupField}[1].${nestedField}[1].${commentField}.value`,
              customTextKey: 'row.nested',
            },
          ]
        : [];
      res.send(body);
    });
  });
  cy.reload();
  cy.waitForLoad();
  cy.gotoNavPage('repeating');
}

describe('Repeating group nested validation and visibility', () => {
  it('opens a nested field on the right internal page and preserves nested row context', () => {
    setup(true);
    cy.get(row(0)).find(indicator).should('not.exist');
    cy.get(row(1)).find(indicator).should('have.attr', 'data-color', 'warning');
    cy.get(row(1)).find(indicator).click();
    cy.findByRole('dialog', { name: 'Meldinger' }).should('contain.text', 'Kontroller: Andre kommentar');
    cy.findByRole('dialog', { name: 'Meldinger' })
      .findByRole('button', { name: 'Kontroller: Andre kommentar' })
      .click();
    cy.get('#validationComment-1-1').should('be.visible').and('have.focus');
    cy.get('#group-validationNested-1-table-body > tr[data-row-num="1"]').find(indicator).should('be.visible');
    cy.get(row(1)).find(indicator).should('have.attr', 'aria-expanded', 'false');
  });

  it('does not reveal deferred validations until existing visibility rules reveal them', () => {
    setup(false);
    cy.get('#group-validationGroup').find(indicator).should('not.exist');
    cy.findByRole('button', { name: /Neste/ }).last().click();
    cy.get(row(0)).find(indicator).should('have.attr', 'data-color', 'danger');
    cy.get(appFrontend.errorReport).should('contain.text', 'opprinnelig beløp');
    cy.changeLayout((component) => {
      if (component.id === 'validationValue') {
        component.hidden = true;
      }
    });
    cy.get('#group-validationGroup').find(indicator).should('not.exist');
  });
});
