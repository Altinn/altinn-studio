import { AppFrontend } from 'test/e2e/pageobjects/app-frontend';
import { interceptAltinnAppGlobalData } from 'test/e2e/support/intercept-global-data';

import type { JsonPatch } from 'src/features/formData/jsonPatch/types';
import type { IDataModelMultiPatchRequest, IDataModelMultiPatchResponse } from 'src/features/formData/types';

const appFrontend = new AppFrontend();

function assertChanges(row: string, total: string = row) {
  cy.findByLabelText(/^Calculated change/).should('have.text', row);
  cy.findByLabelText(/^Total change/).should('have.text', total);
}

const rows = '/Endringsmelding-grp-9786/OversiktOverEndringene-grp-9788';
const calculatedPointers = [`${rows}/0/CalculatedChange`, '/sumAll', '/ChangeList', '/ChangeSummary', '/ChangeRows'];

/**
 * Removes every change to the calculated fields from a patch, and returns the pointers it removed. Changes are either
 * operations at or below a pointer, or a value added above it, such as a new row.
 */
function removeCalculatedFields(patch: JsonPatch): { patch: JsonPatch; removed: Set<string> } {
  const removed = new Set<string>();
  const kept = patch.filter((operation) => {
    const pointer = calculatedPointers.find((p) => operation.path === p || operation.path.startsWith(`${p}/`));
    if (pointer) {
      removed.add(pointer);
      return false;
    }
    if (operation.op === 'add' || operation.op === 'replace') {
      for (const p of calculatedPointers.filter((p) => p.startsWith(`${operation.path}/`))) {
        const keys = p.slice(operation.path.length + 1).split('/');
        const last = keys.pop() as string;
        const parent = keys.reduce((value, key) => value?.[key], operation.value);
        if (parent && typeof parent === 'object' && last in parent) {
          delete parent[last];
          removed.add(p);
        }
      }
    }
    return true;
  });
  return { patch: kept, removed };
}

function saveAndReturn() {
  cy.gotoNavPage('Kjæledyr');
  cy.gotoNavPage('repeating');
  cy.get(appFrontend.group.row(0).editBtn).click();
}

describe('Expression calculations stored in the data model', () => {
  it('shows calculations before saving, persists them, and handles empty, negative and normalized inputs', () => {
    // Defer saving until navigation so the displayed results prove that calculations run in the frontend.
    interceptAltinnAppGlobalData((data) => {
      data.ui.settings!.autoSaveBehavior = 'onChangePage';
    });
    cy.goto('group');
    cy.gotoNavPage('repeating');
    cy.findByLabelText(/^Total change/).should('have.text', 'NOK 0');
    cy.get(appFrontend.group.showGroupToContinue).findByRole('checkbox', { name: 'Ja' }).check();
    cy.get(appFrontend.group.addNewItem).click();
    cy.get(appFrontend.group.row(0).currentValue).numberFormatReplace('10');
    cy.get(appFrontend.group.row(0).newValue).numberFormatReplace('40');
    assertChanges('NOK 30');

    cy.gotoNavPage('Kjæledyr');
    cy.reload();
    cy.gotoNavPage('repeating');
    cy.get(appFrontend.group.row(0).editBtn).click();
    assertChanges('NOK 30');

    cy.get(appFrontend.group.row(0).currentValue).numberFormatReplace('100');
    cy.get(appFrontend.group.row(0).newValue).numberFormatReplace('25');
    assertChanges('-NOK 75');
    cy.get(appFrontend.group.row(0).newValue).numberFormatReplace('100');
    assertChanges('NOK 0');
    cy.get(appFrontend.group.row(0).newValue).clear();
    assertChanges('-NOK 100');

    cy.get(appFrontend.group.row(0).newValue).numberFormatReplace('25');
    // The test app normalizes 1337 to 1338 when saving.
    cy.get(appFrontend.group.row(0).currentValue).numberFormatReplace('1337');
    assertChanges('-NOK 1 312');
    saveAndReturn();
    cy.get(appFrontend.group.row(0).currentValue).should('have.value', 'NOK 1 338');
    assertChanges('-NOK 1 313');

    cy.get(appFrontend.group.saveMainGroup).click();
    cy.get(appFrontend.group.row(0).deleteBtn).click();
    cy.findByLabelText(/^Total change/).should('have.text', 'NOK 0');
    cy.findByLabelText(/^Calculated change/).should('not.exist');
    cy.gotoNavPage('Kjæledyr');
    cy.reload();
    cy.gotoNavPage('repeating');
    cy.findByLabelText(/^Total change/).should('have.text', 'NOK 0');
    cy.get(appFrontend.group.mainGroupTableBody).find('tr').should('have.length', 0);

    cy.gotoNavPage('prefill');
    cy.findByRole('checkbox', { name: appFrontend.group.prefill.liten }).check();
    cy.findByRole('checkbox', { name: appFrontend.group.prefill.middels }).check();
    cy.gotoNavPage('repeating');
    cy.findByLabelText(/^Total change/).should('have.text', 'NOK 234');
    cy.findByRole('button', { name: 'Se innhold NOK 1' }).click();
    assertChanges('NOK 4', 'NOK 234');
    cy.gotoNavPage('Kjæledyr');
  });
});

describe('Calculations into lists and objects', () => {
  it('runs in the frontend before saving and again in the backend when saving', () => {
    // Defer saving until navigation, so the frontend has calculated everything before the backend sees the data.
    interceptAltinnAppGlobalData((data) => {
      data.ui.settings!.autoSaveBehavior = 'onChangePage';
    });
    cy.goto('group');
    cy.gotoNavPage('repeating');
    cy.get(appFrontend.group.showGroupToContinue).findByRole('checkbox', { name: 'Ja' }).check();
    cy.get(appFrontend.group.addNewItem).click();
    cy.get(appFrontend.group.row(0).currentValue).numberFormatReplace('10');
    cy.get(appFrontend.group.row(0).newValue).numberFormatReplace('40');
    assertChanges('NOK 30');

    // The frontend has calculated the list, the object and the rows, and nothing is saved yet.
    cy.window().should((win) => {
      const formData = win.CypressState?.formData?.['nested-group'] as Record<string, unknown> | undefined;
      expect(formData?.ChangeList).to.deep.equal([30]);
      expect(formData?.ChangeSummary).to.deep.equal({ Total: 30, Rows: 1 });
      expect(formData?.ChangeRows).to.have.length(1);
      expect(formData?.ChangeRows).to.have.nested.property('[0].Change', 30);
      expect(formData?.ChangeRows).to.have.nested.property('[0].altinnRowId').that.is.a('string');
    });

    // Send the save without the calculated values, so only a backend calculation can put them in the response.
    const removed = new Set<string>();
    let saved: Record<string, unknown> | undefined;
    cy.intercept({ method: 'PATCH', url: '**/data?*' }).as('save');
    cy.intercept({ method: 'PATCH', url: '**/data?*', times: 1 }, (req) => {
      const body = req.body as IDataModelMultiPatchRequest;
      for (const item of body.patches) {
        const result = removeCalculatedFields(item.patch);
        item.patch = result.patch;
        result.removed.forEach((pointer) => removed.add(pointer));
      }
      req.on('response', (res) => {
        const response = res.body as IDataModelMultiPatchResponse;
        saved = response.newDataModels.find(({ data }) => 'ChangeList' in data)?.data as Record<string, unknown>;
      });
    }).as('saveWithoutCalculations');
    cy.gotoNavPage('Kjæledyr');
    cy.wait('@saveWithoutCalculations');

    cy.then(() => {
      expect([...removed].sort(), 'calculated values the frontend sent').to.deep.equal([...calculatedPointers].sort());
      const row = (saved?.['Endringsmelding-grp-9786'] as Record<string, Record<string, unknown>[]> | undefined)?.[
        'OversiktOverEndringene-grp-9788'
      ]?.[0];
      expect(row?.CalculatedChange, 'row calculated by the backend').to.equal(30);
      expect(saved?.sumAll, 'sum calculated by the backend').to.equal(30);
      expect(saved?.ChangeList, 'list calculated by the backend').to.deep.equal([30]);
      expect(saved?.ChangeSummary, 'object calculated by the backend').to.deep.equal({ Total: 30, Rows: 1 });
      expect(saved?.ChangeRows, 'rows calculated by the backend').to.have.length(1);
      expect(saved?.ChangeRows).to.have.nested.property('[0].Change', 30);
      expect(saved?.ChangeRows).to.have.nested.property('[0].altinnRowId').that.is.a('string');
    });

    // The response has the row ids the backend gave the rows, which the frontend keeps when it calculates again,
    // so nothing is left to save: the next page changes do not save again.
    cy.gotoNavPage('repeating');
    cy.get(appFrontend.group.mainGroupTableBody).find('tr').should('have.length', 1);
    cy.gotoNavPage('Kjæledyr');
    cy.get(appFrontend.pets.decisionPanel.manualButton).should('be.visible');
    cy.get('@save.all').should('have.length', 1);
    cy.window().should((win) => {
      const formData = win.CypressState?.formData?.['nested-group'] as Record<string, unknown> | undefined;
      expect(formData?.ChangeRows).to.deep.equal(saved?.ChangeRows);
    });
  });
});
