import { interceptAltinnAppGlobalData } from 'test/e2e/support/intercept-global-data';

import type { FormBootstrapResponse } from 'src/features/formBootstrap/types';

describe('PDF validation exclusions', () => {
  it('omits excluded column errors instead of moving them to another column', { retries: 0 }, () => {
    interceptAltinnAppGlobalData((data) => {
      data.ui.folders.Task_3.components = { excludeFromPdf: ['newValue'] };
      data.ui.folders.Task_3.pages.pdfLayoutName = 'summary';
    });
    cy.goto('group');
    cy.findByRole('checkbox', { name: /liten/i }).check();
    cy.gotoNavPage('repeating');
    cy.findByRole('checkbox', { name: /ja/i }).check();

    cy.testPdf({
      freeze: false,
      beforeReload: () => {
        cy.intercept('GET', '**/bootstrap-form/Task_3*', (req) => {
          req.on('before:response', (res) => {
            const body = res.body as FormBootstrapResponse;
            const group = body.layouts.repeating.data.layout.find((component) => component.id === 'mainGroup');
            if (group?.type !== 'RepeatingGroup') {
              throw new Error('Missing repeating-group PDF fixture');
            }
            group.children = ['currentValue', 'newValue', 'main-comments'];
            group.tableHeaders = ['currentValue', 'newValue', 'main-comments'];
            group.edit = { ...group.edit, multiPage: false };
            body.layouts.summary.data.layout = [
              {
                id: 'pdf-table-summary',
                type: 'Summary2',
                target: { type: 'component', id: 'mainGroup' },
                overrides: [{ componentType: 'RepeatingGroup', display: 'table' }],
              },
            ];
            body.validationIssues = [
              {
                componentId: 'newValue',
                rowIndexes: [0],
                dataElementId: '',
                description: 'Excluded PDF field error',
                severity: 1,
                source: 'PdfExclusionRegression',
                showImmediately: true,
              },
              {
                componentId: 'main-comments',
                rowIndexes: [0],
                dataElementId: '',
                description: 'Included PDF field error',
                severity: 1,
                source: 'PdfExclusionRegression',
                showImmediately: true,
              },
            ];
          });
        });
      },
      callback: () => {
        cy.findByRole('columnheader', { name: 'Endre fra' }).should('be.visible');
        cy.contains('td', 'NOK 1').should('be.visible');
        cy.contains('Included PDF field error').should('be.visible');
        cy.contains('Excluded PDF field error', { timeout: 0 }).should('not.exist');
        cy.findByRole('columnheader', { name: 'Endre til', timeout: 0 }).should('not.exist');
      },
    });
  });
});
