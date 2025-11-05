import { AppFrontend } from 'test/e2e/pageobjects/app-frontend';

import type { ILayoutSettings } from 'src/layout/common.generated';
import type { ILayoutCollection } from 'src/layout/layout';

const appFrontend = new AppFrontend();

describe('PDF', () => {
  it('Custom PDF page with hideEmptyFields, custom logo, externalApi', { retries: 0 }, () => {
    const pdfLayoutName = 'pdf-page';
    cy.intercept('GET', '**/layoutsettings/**', (req) =>
      req.on('response', (res) => {
        const body: ILayoutSettings = JSON.parse(res.body);
        res.send({
          ...body,
          pages: { ...body.pages, pdfLayoutName },
        });
      }),
    );
    cy.intercept('GET', '**/layouts/**', (req) =>
      req.on('response', (res) => {
        const body: ILayoutCollection = JSON.parse(res.body);
        res.send({
          ...body,
          [pdfLayoutName]: {
            data: {
              layout: [
                {
                  id: 'Summary2-hideEmptyFields-PDF',
                  type: 'Summary2',
                  hideEmptyFields: true,
                  overrides: [
                    { pageId: 'SummaryPage', hidden: true },
                    { componentType: 'Grid', hideEmptyRows: true },
                  ],
                },
              ],
            },
          },
        });
      }),
    );

    cy.startAppInstance(appFrontend.apps.componentLibrary);
    cy.waitForLoad();

    cy.testPdf({
      snapshotName: 'hideEmptyFields',
      enableResponseFuzzing: true,
      callback: () => {
        // Asserting that custom logo and externalApi works
        cy.get('[data-testid="pdf-logo"]').should('be.visible');
        cy.get('[data-summary-target="textWithoutLabel"]').should('contain.text', 'firstDetail');

        // This Grid component should not display anything, because all cells are empty and thus the header row
        // should also be empty.
        cy.get('[data-summary-target="grid-example-common-fields"]').should('exist').and('not.be.visible');
      },
    });
  });
});
