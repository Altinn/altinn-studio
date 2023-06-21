/// <reference types="cypress" />
/// <reference types="../../support" />

import { designer } from '../../pageobjects/designer';

context('Designer', () => {
  before(() => {
    cy.visit('/');
    cy.studiologin(Cypress.env('autoTestUser'), Cypress.env('autoTestUserPwd'));
    cy.getrepo(Cypress.env('designerApp'), Cypress.env('accessToken')).then((response) => {
      if (response.status === 404) {
        const [_, appName] = Cypress.env('designerApp').split('/');
        cy.createapp(Cypress.env('autoTestUser'), appName);
      }
    });
    cy.visit('/');
    cy.getrepo(Cypress.env('withoutDataModelApp'), Cypress.env('accessToken')).then((response) => {
      if (response.status !== 200) {
        const [_, appName] = Cypress.env('withoutDataModelApp').split('/');
        cy.createapp(Cypress.env('autoTestUser'), appName);
      }
    });
    cy.clearCookies();
    cy.studiologin(Cypress.env('autoTestUser'), Cypress.env('autoTestUserPwd'));
  });
  beforeEach(() => {
    cy.visit('/dashboard');
  });

  it('is possible to edit information about the app', () => {
    const designerApp = Cypress.env('designerApp');
    cy.searchAndOpenApp(designerApp);
    cy.contains(designer.aboutApp.appHeader, 'Om appen').should('be.visible');
    cy.contains("[data-testid='administrationInputAppName_ChangeButton']", 'Endre').click();
    cy.get(designer.aboutApp.appName).clear().type('New app name');
    cy.get(designer.aboutApp.appDescription).click().clear().type('App description');
    cy.get(designer.aboutApp.appName).invoke('val').should('contain', 'New app name');
    cy.get(designer.aboutApp.appDescription).invoke('val').should('contain', 'App description');
    cy.visit(`/editor/${designerApp}/text-editor`);
    cy.contains('textarea', 'New app name');
  });

  it('is possible to add and delete form components', () => {
    cy.searchAndOpenApp(Cypress.env('designerApp'));
    cy.findByRole('link', { name: designer.appMenu.editText }).click();
    cy.get("button[aria-label='Legg til ny side']").click();
    cy.get(designer.formComponents.shortAnswer).parents(designer.draggable).trigger('dragstart');
    cy.get(designer.dragToArea).trigger('drop');
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
