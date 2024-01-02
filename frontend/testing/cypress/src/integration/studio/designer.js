/// <reference types="cypress" />
/// <reference types="../../support" />

import * as texts from '../../../../../language/src/nb.json';
import { designer } from '../../selectors/designer';
import { header } from '../../selectors/header';

const designerAppId = `${Cypress.env('autoTestUser')}/${Cypress.env('designerAppName')}`;
const initialPageName = 'MyFirstFormPage';

context('Designer', () => {
  before(() => {
    cy.deleteAllApps(Cypress.env('autoTestUser'), Cypress.env('accessToken'));
    cy.studioLogin(Cypress.env('autoTestUser'), Cypress.env('autoTestUserPwd'));
    cy.createApp(Cypress.env('autoTestUser'), Cypress.env('designerAppName'));
  });
  beforeEach(() => {
    cy.visit('/dashboard');
  });

  after(() => {
    cy.deleteAllApps(Cypress.env('autoTestUser'), Cypress.env('accessToken'));
  });

  it('is possible to add and delete form components', () => {
    cy.intercept('GET', '**/app-development/layout-settings?**').as('getLayoutSettings');
    cy.intercept('POST', '**/app-development/layout-settings?**').as('postLayoutSettings');

    // Navigate to designerApp
    cy.visit('/editor/' + designerAppId);
    header.getCreateLink().click();
    cy.ensureCreatePageIsLoaded();

    designer.getPageHeaderButton(initialPageName).should('be.visible');
    designer.getPageHeaderButton(initialPageName).click();

    // Add an input component
    designer.getToolbarItemByText(texts['ux_editor.component_title.Input']).trigger('dragstart');
    designer.getDroppableList().trigger('drop');
    cy.wait(500);
    designer
      .getPageAccordionByName(initialPageName)
      .findByRole('treeitem', { name: texts['ux_editor.component_title.Input'] });

    // Do not need to confirm alert.confirm dialog, since Cypress default to click "Ok".
    cy.findByTitle(texts['general.delete_item'].replace('{{item}}', initialPageName)).click({
      force: true,
    });
  });

  it('should add navigation buttons when adding more than one page', () => {
    cy.intercept('GET', '**/app-development/layout-settings?**').as('getLayoutSettings');
    cy.intercept('POST', '**/app-development/layout-settings?**').as('postLayoutSettings');

    // Navigate to designerApp
    cy.visit('/editor/' + designerAppId);
    header.getCreateLink().click();
    cy.ensureCreatePageIsLoaded();

    // Add two new pages to ensure that navigation-buttons will be added to page
    designer.getAddPageButton().click();

    cy.wait('@postLayoutSettings').its('response.statusCode').should('eq', 200);
    cy.wait('@getLayoutSettings').its('response.statusCode').should('eq', 200);

    designer.getAddPageButton().click();

    cy.wait('@postLayoutSettings').its('response.statusCode').should('eq', 200);
    cy.wait('@getLayoutSettings').its('response.statusCode').should('eq', 200);

    designer
      .getPageAccordionByName('Side2')
      .findByRole('treeitem', { name: `${texts['ux_editor.component_title.NavigationButtons']}` });

    // Do not need to confirm alert.confirm dialog, since Cypress default to click "Ok".
    cy.findByTitle(texts['general.delete']).click({ force: true });
  });
});
