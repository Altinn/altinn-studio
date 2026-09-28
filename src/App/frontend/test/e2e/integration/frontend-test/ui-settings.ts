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

describe('Expanded width chosen by the user', () => {
  it('Keeps the chosen width when moving between pages in the same task', () => {
    interceptAltinnAppGlobalData((data) => {
      data.ui.folders.Task_2.pages.showExpandWidthButton = true;
    });
    cy.goto('changename');
    cy.get(appFrontend.notExpandedWidth).should('exist');

    cy.get(appFrontend.expandWidthButton).click();
    cy.get(appFrontend.expandedWidth).should('exist');

    cy.gotoNavPage('grid');
    cy.get(appFrontend.expandedWidth).should('exist');
  });

  it('Returns to the configured width when the next task has no expand button', () => {
    // The confirmation task offers no way back to the standard width, so it must render as configured.
    interceptAltinnAppGlobalData((data) => {
      data.ui.folders.Task_5.pages.showExpandWidthButton = true;
    });
    cy.gotoAndComplete('datalist');

    cy.get(appFrontend.expandWidthButton).click();
    cy.get(appFrontend.expandedWidth).should('exist');

    cy.get(appFrontend.sendinButton).clickAndGone();
    cy.get(appFrontend.confirm.container).should('be.visible');
    cy.get(appFrontend.notExpandedWidth).should('exist');
    cy.get(appFrontend.expandWidthButton).should('not.exist');
  });
});
