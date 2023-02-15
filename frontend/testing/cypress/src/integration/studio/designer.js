/// <reference types="cypress" />
/// <reference types="../../support" />

import { designer } from '../../pageobjects/designer';
import { header } from '../../pageobjects/header';

context('Designer', () => {
  before(() => {
    cy.visit('/');
    cy.studiologin(Cypress.env('autoTestUser'), Cypress.env('autoTestUserPwd'));
    cy.getrepo(Cypress.env('designerApp'), Cypress.env('accessToken')).then((response) => {
      if (response.status !== 200) {
        const [_, appName] = Cypress.env('designerApp').split('/');
        cy.createapp('Testdepartementet', appName);
      }
    });
    cy.visit('/');
    cy.getrepo(Cypress.env('withoutDataModelApp'), Cypress.env('accessToken')).then((response) => {
      if (response.status !== 200) {
        const [_, appName] = Cypress.env('withoutDataModelApp').split('/');
        cy.createapp('Testdepartementet', appName);
      }
    });
    cy.clearCookies();
  });
  beforeEach(() => {
    cy.visit('/');
    cy.studiologin(Cypress.env('autoTestUser'), Cypress.env('autoTestUserPwd'));
  });

  it('is possible to edit information about the app', () => {
    cy.searchAndOpenApp(Cypress.env('designerApp'));
    cy.contains(designer.aboutApp.appHeader, 'Om appen').should('be.visible');
    cy.contains("[data-testid='administrationInputAppName_ChangeButton']", 'Endre').click();
    cy.get(designer.aboutApp.appName).clear().type('New app name');
    cy.get(designer.aboutApp.appDescription).click().clear().type('App description');
    cy.get(designer.aboutApp.appName).invoke('val').should('contain', 'New app name');
    cy.get(designer.aboutApp.appDescription).invoke('val').should('contain', 'App description');
  });

  it('is possible to add and delete form components', () => {
    cy.searchAndOpenApp(Cypress.env('designerApp'));
    cy.get(designer.appMenu['edit']).click();
    cy.get("button[aria-label='Legg til ny side']").click();
    cy.get(designer.formComponents.shortAnswer).parents(designer.draggable).trigger('dragstart');
    cy.get(designer.dragToArea).trigger('drop');
    cy.deletecomponents();
    cy.get(header.profileIconDesigner).click();
    cy.get(header.menu.openRepo)
      .invoke('attr', 'href')
      .should('include', `/repos/${Cypress.env('designerApp')}`);
    cy.get(header.menu.docs).should('be.visible');
    cy.contains('li', 'Logout').should('be.visible');
  });

  it('is possible to delete local changes of an app ', () => {
    cy.searchAndOpenApp(Cypress.env('designerApp'));
    cy.intercept('GET', '**/layout-settings').as('getLayoutSettings');
    cy.get(designer.appMenu['edit']).click();
    cy.wait('@getLayoutSettings');
    cy.get("button[aria-label='Legg til ny side']").click();
    cy.get(designer.formComponents.longAnswer).parents(designer.draggable).trigger('dragstart');
    cy.get(designer.dragToArea).trigger('drop');
    cy.deleteLocalChanges(Cypress.env('designerApp'));
  });

  it('is possible details of the clone modal ', () => {
    cy.searchAndOpenApp(Cypress.env('withoutDataModelApp'));
    cy.get(designer.appMenu['edit']).click();
    cy.contains('button', 'Clone').scrollIntoView().should('be.visible').click();
    cy.get(designer.clone.docs).should('be.visible');
    cy.contains('div', designer.clone.missingDatamodel).should('be.visible');
    cy.get(designer.clone.datamodelLink).should('be.visible');
    cy.get(designer.clone.copyRepo).should('be.visible');
  });
});
