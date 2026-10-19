import { AppFrontend } from 'test/e2e/pageobjects/app-frontend';
import { interceptAltinnAppGlobalData } from 'test/e2e/support/intercept-global-data';

import { getInstanceIdRegExp } from 'src/utils/instanceIdRegExp';

const appFrontend = new AppFrontend();

describe('PDF options failures', () => {
  for (const mode of [
    'generated',
    'legacy',
    'custom',
    'grid',
    'empty-grid',
    'excluded-grid',
    'hidden-grid',
    'excluded',
    'unused',
  ] as const) {
    const usesGrid = ['grid', 'empty-grid', 'excluded-grid', 'hidden-grid'].includes(mode);
    const shouldBlock = ['generated', 'legacy', 'custom', 'grid'].includes(mode);
    it(`${shouldBlock ? 'blocks' : 'allows'} PDF generation for ${mode} options`, () => {
      cy.ignoreConsoleMessages([/Failed to fetch options for node reference/, /Request failed with status code 500/]);
      if (shouldBlock) {
        cy.allowFailureOnEnd();
      }
      interceptAltinnAppGlobalData((data) => {
        if (mode === 'excluded' || mode === 'excluded-grid') {
          data.ui.folders.Task_2.components = { excludeFromPdf: ['reference'] };
        }
        if (mode === 'custom') {
          data.ui.folders.Task_2.pages.pdfLayoutName = 'form';
        }
        if (mode === 'legacy' || usesGrid || mode === 'unused') {
          data.ui.folders.Task_2.pages.pdfLayoutName = 'summary';
          data.ui.folders.Task_2.pages.excludeFromPdf = [];
        }
      });
      cy.goto('changename');
      if (mode !== 'empty-grid') {
        cy.dsSelect(appFrontend.changeOfName.reference, 'Ola Nordmann');
      } else {
        cy.get(appFrontend.changeOfName.reference).should('have.value', '');
      }
      cy.waitUntilSaved();

      if (mode === 'legacy' || usesGrid || mode === 'unused') {
        cy.interceptLayout(
          'Task_2',
          undefined,
          (layouts) => {
            if (mode === 'hidden-grid') {
              const reference = layouts.form!.data.layout.find((component) => component.id === 'reference');
              if (reference) {
                reference.hidden = true;
              }
            }
            if (usesGrid) {
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
                      id: usesGrid ? 'options-grid' : 'newFirstName',
                    },
                  },
            ];
          },
          {},
        );
      }
      cy.intercept('GET', '**/api/options/references*', { statusCode: 500 }).as('failedOptions');
      let readinessObserved = false;
      cy.url().then((href) => {
        const regex = getInstanceIdRegExp();
        const instanceId = regex.exec(href)![1];
        const pdfUrl = `${href.split(regex)[0]}${instanceId}?pdf=1`;
        cy.window().then((win) => {
          win.location.href = 'about:blank';
        });
        cy.visit(pdfUrl, {
          onBeforeLoad(win) {
            const observer = new win.MutationObserver((records) => {
              if (win.document.getElementById('readyForPrint')) {
                readinessObserved = true;
              }
              for (const record of records) {
                if (record.type === 'attributes' && record.oldValue === 'readyForPrint') {
                  readinessObserved = true;
                }
                for (const node of record.addedNodes) {
                  if (
                    node instanceof win.Element &&
                    (node.id === 'readyForPrint' || node.querySelector('#readyForPrint'))
                  ) {
                    readinessObserved = true;
                  }
                }
              }
            });
            observer.observe(win.document, {
              childList: true,
              subtree: true,
              attributes: true,
              attributeFilter: ['id'],
              attributeOldValue: true,
            });
          },
        });
      });
      if (mode !== 'excluded' && mode !== 'excluded-grid' && mode !== 'hidden-grid') {
        cy.wait('@failedOptions').its('response.statusCode').should('eq', 500);
      }
      cy.get('#readyForPrint, [data-fatal-error]').should('exist');
      if (shouldBlock) {
        cy.get('[data-fatal-error]').should('exist');
        cy.get('#readyForPrint', { timeout: 0 }).should('not.exist');
        cy.get('#pdfView', { timeout: 0 }).should('not.exist');
        cy.then(() => expect(readinessObserved, 'readiness was never exposed').to.eq(false));
      } else {
        cy.get('#readyForPrint').should('exist');
        cy.get('[data-fatal-error]', { timeout: 0 }).should('not.exist');
      }
    });
  }
});
