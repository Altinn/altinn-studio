/// <reference types="cypress" />
/// <reference types="../../support" />

import { header } from '../../selectors/header';
import { datamodel } from '../../selectors/datamodel';
import * as texts from '../../../../../language/src/nb.json';

context('datamodel', () => {
  before(() => {
    cy.studioLogin(Cypress.env('autoTestUser'), Cypress.env('autoTestUserPwd'));
    cy.createApp(Cypress.env('autoTestUser'), Cypress.env('designerAppName'));
  });

  beforeEach(() => {
    cy.visit('/dashboard');
    cy.searchAndOpenApp(Cypress.env('designerAppName'));

    // Navigate to datamodels page and close dialog
    header.getDatamodelLink().click();
  });

  after(() => {
    cy.deleteAllApps(Cypress.env('autoTestUser'), Cypress.env('accessToken'));
  });

  it('add a new data model', () => {
    datamodel.getCreateNewButton().click();
    cy.findByRole('textbox').type('datamodel');
    cy.findByRole('button', { name: texts['schema_editor.create_model_confirm_button'] }).click();
    datamodel.getProperty('property1').click();
  });

  it('edit a data model', () => {
    datamodel.getProperty('property1').click();
    datamodel.getNameField().clear().type('myProperty');

    // Hack to ensure focus. Find out why we need to click twice and fix!
    datamodel.getTypeField().click();
    datamodel.getTypeField().click();

    cy.findByRole('option', { name: texts['schema_editor.integer'] }).click();
    datamodel.getTypeField().invoke('val').should('eq', texts['schema_editor.integer']);
  });
});
