import { AppFrontend } from 'test/e2e/pageobjects/app-frontend';
import { interceptAltinnAppGlobalData } from 'test/e2e/support/intercept-global-data';

const appFrontend = new AppFrontend();

describe('Expanded width', () => {
  it('Shows page with expandedWidth in settings as expanded', () => {
    interceptAltinnAppGlobalData((data) => {
      data.ui.folders.Task_2 = {
        defaultDataType: data.ui.folders.Task_2.defaultDataType,
        pages: {
          order: ['form', 'summary', 'grid'],
          excludeFromPdf: ['summary'],
          showLanguageSelector: true,
          expandedWidth: true,
        },
        components: {
          excludeFromPdf: ['confirmChangeName'],
        },
      };
    });
    cy.goto('changename');
    cy.get(appFrontend.expandedWidth).should('exist');

    cy.gotoNavPage('grid');
    cy.get(appFrontend.expandedWidth).should('exist');
  });

  it('Overwrites page with expandedWidth in settings from layout', () => {
    interceptAltinnAppGlobalData((data) => {
      data.ui.folders.Task_2 = {
        defaultDataType: data.ui.folders.Task_2.defaultDataType,
        pages: {
          order: ['form', 'summary', 'grid'],
          excludeFromPdf: ['summary'],
          showLanguageSelector: true,
          expandedWidth: true,
        },
        components: {
          excludeFromPdf: ['confirmChangeName'],
        },
      };
    });
    cy.interceptLayout(
      'Task_2',
      () => {},
      (layoutSet) => {
        layoutSet.grid.data.expandedWidth = false;
      },
    );
    cy.goto('changename');
    cy.get(appFrontend.expandedWidth).should('exist');

    cy.gotoNavPage('grid');
    cy.get(appFrontend.notExpandedWidth).should('exist');
  });
});
