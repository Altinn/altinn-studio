/// <reference types="cypress" />
/// <reference types="../../support" />

import { designer } from '../../pageobjects/designer';
import { header } from '../../pageobjects/header';
import Common from '../../pageobjects/common';

const common = new Common();

context('Designer', () => {
  before(() => {
    if (Cypress.env('environment') == 'local') {
      cy.visit('/');
      cy.studiologin(Cypress.env('autoTestUser'), Cypress.env('autoTestUserPwd'));
      cy.createapp(Cypress.env('appOwner'), 'designer');
      cy.get(header.profileIconDesigner).click();
      cy.contains(header.menuItem, 'Logout').click();
    }
  });
  beforeEach(() => {
    cy.visit('/');
    cy.studiologin(Cypress.env('autoTestUser'), Cypress.env('autoTestUserPwd'));
  });

  it('is possible to edit information about the app', () => {
    cy.searchAndOpenApp(Cypress.env('designerApp'));
    cy.contains(designer.aboutApp.appHeader, 'Om appen').should('be.visible');
    cy.contains(common.button, 'Endre').click();
    cy.get(designer.aboutApp.appName).clear().type('New app name');
    cy.get(designer.aboutApp.appDescription).click().clear().type('App description');
    cy.get(designer.aboutApp.appName).invoke('val').should('contain', 'New app name');
    cy.get(designer.aboutApp.appDescription).invoke('val').should('contain', 'App description');
  });

  it('is possible to add and delete form components', () => {
    cy.searchAndOpenApp(Cypress.env('designerApp'));
    cy.get(designer.appMenu['edit']).click();
    cy.get(common.leftDrawer).trigger('mouseover', { force: true });
    cy.get(designer.appEditorMenu['datamodel']).should('be.visible');
    cy.get(common.leftDrawer).trigger('mouseout');
    cy.get(designer.formComponents.shortAnswer).parents(designer.draggable).trigger('dragstart');
    cy.get(designer.dragToArea).parents(designer.draggable).trigger('drop');
    cy.deletecomponents();
    cy.get(header.profileIconDesigner).click();
    cy.get(header.menu.openRepo)
      .invoke('attr', 'href')
      .should('include', `/repos/${Cypress.env('designerApp')}`);
    cy.get(header.menu.docs).should('be.visible');
    cy.contains('li', 'Logout').should('be.visible');
  });

  it('is possible to add and delete text resources', () => {
    cy.searchAndOpenApp(Cypress.env('designerApp'));
    cy.get(designer.appMenu.texts).click();
    cy.getIframeBody().find(designer.texts.root).find(designer.texts.new).should('be.visible').click();
    cy.intercept('POST', '**/SaveResource/**').as('saveText');
    cy.getIframeBody()
      .find(designer.texts.resources)
      .last()
      .then((newText) => {
        cy.get(newText).find(designer.texts.resourceId).should('be.visible').type('test').tab();
        cy.get(newText).find(designer.texts.resourceValue).should('be.visible').type('automation').tab();
        cy.get(newText).find(designer.texts.requiredError).should('be.visible');
        cy.getIframeBody().find(designer.texts.save).should('be.visible').focus().click();
        cy.wait('@saveText').its('response.statusCode').should('eq', 200);
        cy.get(newText).find(designer.texts.delete).should('be.visible').click();
        cy.getIframeBody().find(designer.texts.save).should('be.visible').focus().click();
        cy.wait('@saveText').its('response.statusCode').should('eq', 200);
      });
  });

  it('is possible to configure rules and dynamics ', () => {
    cy.searchAndOpenApp(Cypress.env('designerApp'));
    cy.get(designer.appMenu['edit']).click();
    cy.contains('span', 'Rediger dynamikk').should('be.visible');
    cy.get(designer.rules.add).should('be.visible').click();
    cy.get(designer.rules.list).should('be.visible').select('sum');
    cy.get(designer.rules.paramA).parents('.col').siblings().find(designer.rules.paramValue).click();
    cy.get(designer.rules.dataModelBinding).should('have.length.above', 0);
    cy.get(designer.submit).scrollIntoView().should('be.visible').click();
    cy.contains(common.gridItem, 'sum').should('be.visible').click();
    cy.get(designer.delete).scrollIntoView().should('be.visible').click();
    cy.contains(common.gridItem, 'sum').should('not.exist');
    cy.get(designer.dynamics.add).should('be.visible').click();
    cy.get(designer.dynamics.list).should('be.visible').select('biggerThan10');
    cy.get(designer.dynamics.action).should('be.visible');
    cy.get(designer.submit).scrollIntoView().should('be.visible').click();
    cy.contains(common.gridItem, 'biggerThan10').should('be.visible').click();
    cy.get(designer.delete).scrollIntoView().should('be.visible').click();
    cy.contains(common.gridItem, 'biggerThan10').should('not.exist');
  });

  it('is possible to delete local changes of an app ', () => {
    cy.searchAndOpenApp(Cypress.env('designerApp'));
    cy.get(designer.appMenu['edit']).click();
    cy.intercept('GET', '**/status').as('getRepoStatus');
    cy.get(designer.formComponents.shortAnswer).parents(designer.draggable).click().type('{enter}');
    cy.wait('@getRepoStatus');
    cy.get(designer.syncApp.push).scrollIntoView().isVisible();
    cy.deleteLocalChanges(Cypress.env('designerApp'));
    cy.get(designer.syncApp.noChanges).scrollIntoView().isVisible();
  });

  it('is possible details of the clone modal ', () => {
    cy.searchAndOpenApp(Cypress.env('withoutDataModelApp'));
    cy.get(designer.appMenu['edit']).click();
    cy.contains('button', 'Clone').scrollIntoView().should('be.visible').click();
    cy.get(designer.clone.docs).should('be.visible');
    cy.contains('p', designer.clone.missingDatamodel).should('be.visible');
    cy.get(designer.clone.datamodelLink).should('be.visible');
    cy.get(designer.clone.copyRepo).should('be.visible');
  });
});
