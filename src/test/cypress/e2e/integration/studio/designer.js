/// <reference types="cypress" />
/// <reference types="../../support" />

import { designer } from '../../pageobjects/designer';
import { dashboard } from '../../pageobjects/dashboard';
import { header } from '../../pageobjects/header';
import Common from '../../pageobjects/common';

const common = new Common();

context('Designer', () => {
  before(() => {
    if (Cypress.env('environment') == 'local') {
      cy.visit('/');
      cy.studiologin(Cypress.env('autoTestUser'), Cypress.env('autoTestUserPwd'));
      cy.createapp(Cypress.env('appOwner'), 'designer');
      cy.get(header.profileButton).click();
      cy.contains(header.menuItem, 'Logout').click();
    }
  });
  beforeEach(() => {
    cy.visit('/');
    cy.studiologin(Cypress.env('autoTestUser'), Cypress.env('autoTestUserPwd'));
    var appName = Cypress.env('deployApp').split('/')[1];
    cy.get(dashboard.searchApp).type(appName);
    cy.contains(dashboard.apps.name, appName).siblings(dashboard.apps.links).find(dashboard.apps.edit).click();
  });

  it('About App', () => {
    cy.contains(designer.aboutApp.appHeader, 'Om appen').should('be.visible');
    cy.contains(common.button, 'Endre').click();
    cy.get(designer.aboutApp.appName).clear().type('New app name');
    cy.get(designer.aboutApp.appDescription).clear().type('App description');
    cy.get(designer.aboutApp.appName).invoke('val').should('contain', 'New app name');
    cy.get(designer.aboutApp.appDescription).invoke('val').should('contain', 'App description');
  });

  it('UI Editor', () => {
    cy.get(designer.appMenu['edit']).click();
    cy.get(common.leftDrawer).trigger('mouseover', { force: true });
    cy.get(designer.appEditorMenu['datamodel']).should('be.visible');
    cy.get(common.leftDrawer).trigger('mouseout');
    cy.get(designer.formComponents.shortAnswer).parents(designer.draggable).trigger('dragstart');
    cy.get(designer.dragToArea).parents(designer.draggable).trigger('drop');
    cy.deletecomponents();
  });
});
