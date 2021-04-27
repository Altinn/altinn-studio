/// <reference types="cypress" />

import * as designer from '../../pageobjects/designer';
import * as dashboard from '../../pageobjects/dashboard';
import * as header from '../../pageobjects/header';
import Common from '../../pageobjects/common';

const common = new Common();

context('Designer', () => {
  before(() => {
    cy.visit('/');
    cy.studiologin(Cypress.env('userName'), Cypress.env('userPwd'));
    cy.createapp(Cypress.env('appOwner'), 'designer');
    cy.get(header.profileButton).click();
    cy.contains(header.menuItem, 'Logout').click();
  });
  beforeEach(() => {
    cy.visit('/');
    cy.studiologin(Cypress.env('userName'), Cypress.env('userPwd'));
    cy.get(dashboard.searchApp).type('designer');
    cy.contains(common.gridItem, 'designer').click();
  });

  it('About App', () => {
    cy.contains(designer.appHeader, 'Om appen').should('be.visible');
    cy.contains(common.button, 'Endre').click();
    cy.get(designer.appName).clear().type('New app name');
    cy.get(designer.appDescription).clear().type('App description');
    cy.get(designer.appName).invoke('val').should('contain', 'New app name');
    cy.get(designer.appDescription).invoke('val').should('contain', 'App description');
  });

  it('UI Editor', () => {
    cy.get(designer.appMenu['edit']).click();
    cy.get(common.leftDrawer).trigger('mouseover', { force: true });
    cy.get(designer.appEditorMenu['datamodel']).should('be.visible');
    cy.get(common.leftDrawer).trigger('mouseout');
    cy.get(designer.shortAnswer).parents(designer.draggable).trigger('dragstart');
    cy.get(designer.dragToArea).parents(designer.draggable).trigger('drop');
    cy.deletecomponents();
  });
});
