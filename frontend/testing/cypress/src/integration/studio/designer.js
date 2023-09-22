/// <reference types="cypress" />
/// <reference types="../../support" />

import * as texts from '../../../../../language/src/nb.json';
import { administration } from "../../selectors/administration";
import { designer } from "../../selectors/designer";
import { header } from "../../selectors/header";

context('Designer', () => {
  before(() => {
    cy.visit('/');
    cy.studiologin(Cypress.env('autoTestUser'), Cypress.env('autoTestUserPwd'));
    cy.deleteallapps(Cypress.env('autoTestUser'), Cypress.env('accessToken'));
    const [orgName, appName] = Cypress.env('designerApp').split('/');
    cy.createapp(orgName, appName);
    cy.clearCookies();
    cy.studiologin(Cypress.env('autoTestUser'), Cypress.env('autoTestUserPwd'));
  });
  beforeEach(() => {
    cy.visit('/dashboard');
  });

  it('is possible to edit information about the app', () => {
    const designerApp = Cypress.env('designerApp');
    // Navigate to designerApp
    cy.visit('/editor/' + Cypress.env('designerApp'));
    administration.getHeader().should('be.visible');
    cy.findByRole('button', { name: texts['general.edit'] }).click();
    administration.getAppNameField().clear().type('New app name');
    administration.getDescriptionField().clear().type('App description');
    administration.getAppNameField().invoke('val').should('contain', 'New app name');
    administration.getDescriptionField().invoke('val').should('contain', 'App description');
  });

  it('is possible to add and delete form components', () => {
    cy.intercept('GET', '**/app-development/layout-settings?**').as('getLayoutSettings');
    cy.intercept('POST', '**/app-development/layout-settings?**').as('postLayoutSettings');

    // Navigate to designerApp
    cy.visit('/editor/' + Cypress.env('designerApp'));
    header.getCreateLink().click();
    cy.ensureCreatePageIsLoaded();

    // Add new page and ensure updated data is loaded
    designer.getAddPageButton().click();
    cy.wait('@postLayoutSettings').its('response.statusCode').should('eq', 200);
    cy.wait('@getLayoutSettings').its('response.statusCode').should('eq', 200);
    cy.findByText(texts['general.page'] + '2').should('be.visible');

    // Verify navigation button exists in form
    designer.getDroppableList().findByRole('listitem', { name: texts['ux_editor.component_navigation_buttons'] }).should('be.visible');

    // Add an input component
    designer.getToolbarItemByText(texts['ux_editor.component_input']).trigger('dragstart');
    designer.getDroppableList().trigger('drop');
    cy.wait(500);
    designer.getDroppableList()
      .findAllByRole('listitem')
      .then(($elements) => expect($elements.length).eq(2));

    // Delete components on page
    cy.deletecomponents();
  });

  // Disabled for now, as this generates too many copies of the same app
  // it('is possible to delete local changes of an app ', () => {
  //   cy.searchAndOpenApp(Cypress.env('designerApp'));
  //   cy.intercept('GET', '**/layout-settings').as('getLayoutSettings');
  //   cy.get(designer.appMenu['edit']).click();
  //   cy.wait('@getLayoutSettings');
  //   cy.get("button[aria-label='Legg til ny side']").click();
  //   cy.get(designer.formComponents.longAnswer).parents(designer.draggable).trigger('dragstart');
  //   cy.get(designer.dragToArea).trigger('drop');
  //   cy.deleteLocalChanges(Cypress.env('designerApp'));
  // });
});
