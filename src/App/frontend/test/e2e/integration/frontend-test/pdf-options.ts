import { AppFrontend } from 'test/e2e/pageobjects/app-frontend';
import { interceptAltinnAppGlobalData } from 'test/e2e/support/intercept-global-data';

import { getInstanceIdRegExp } from 'src/utils/instanceIdRegExp';

const appFrontend = new AppFrontend();

describe('PDF options failures', () => {
  for (const mode of ['generated', 'legacy', 'grid', 'empty-grid', 'excluded', 'unused'] as const) {
    it(`${mode === 'excluded' || mode === 'unused' || mode === 'empty-grid' ? 'allows' : 'blocks'} PDF generation for ${mode} options`, () => {
      const shouldBlock = mode !== 'excluded' && mode !== 'unused' && mode !== 'empty-grid';
      cy.ignoreConsoleMessages([/Failed to fetch options for node reference/, /Request failed with status code 500/]);
      if (shouldBlock) {
        cy.allowFailureOnEnd();
      }
      interceptAltinnAppGlobalData((data) => {
        if (mode === 'excluded') {
          data.ui.folders.Task_2.components = { excludeFromPdf: ['reference'] };
        }
        if (mode === 'legacy' || mode === 'grid' || mode === 'empty-grid' || mode === 'unused') {
          data.ui.folders.Task_2.pages.pdfLayoutName = 'summary';
          data.ui.folders.Task_2.pages.excludeFromPdf = [];
        }
      });
      if (mode === 'legacy' || mode === 'grid' || mode === 'empty-grid' || mode === 'unused') {
        cy.interceptLayout(
          'Task_2',
          undefined,
          (layouts) => {
            if (mode === 'grid' || mode === 'empty-grid') {
              const group = layouts.form!.data.layout.find((component) => component.id === 'reference-group');
              if (group?.type === 'Group') {
                group.children = group.children.filter((id) => id !== 'reference');
              }
              layouts.form!.data.layout.push({
                id: 'options-grid',
                type: 'Grid',
                rows: [{ cells: [{ component: 'reference' }] }],
              });
            }
            layouts.summary!.data.layout = [
              mode === 'legacy'
                ? { id: 'options-summary', type: 'Summary', componentRef: 'reference-group' }
                : {
                    id: 'options-summary',
                    type: 'Summary2',
                    target: {
                      type: 'component',
                      id: mode === 'grid' || mode === 'empty-grid' ? 'options-grid' : 'newFirstName',
                    },
                  },
            ];
          },
          {},
        );
      }
      cy.goto('changename');
      if (mode !== 'empty-grid') {
        cy.dsSelect(appFrontend.changeOfName.reference, 'Ola Nordmann');
      } else {
        cy.get(appFrontend.changeOfName.reference).should('have.value', '');
      }
      cy.waitUntilSaved();

      cy.intercept('GET', '**/api/options/references*', { statusCode: 500 }).as('failedOptions');
      cy.url().then((href) => {
        const regex = getInstanceIdRegExp();
        const instanceId = regex.exec(href)![1];
        const pdfUrl = `${href.split(regex)[0]}${instanceId}?pdf=1`;
        cy.window().then((win) => {
          win.location.href = 'about:blank';
        });
        cy.visit(pdfUrl);
      });
      cy.wait('@failedOptions').its('response.statusCode').should('eq', 500);
      cy.get('#readyForPrint, [data-fatal-error]').should('exist');
      if (shouldBlock) {
        cy.get('[data-fatal-error]').should('exist');
        cy.get('#readyForPrint').should('not.exist');
      } else {
        cy.get('#readyForPrint').should('exist');
        cy.get('[data-fatal-error]', { timeout: 0 }).should('not.exist');
      }
    });
  }
});
