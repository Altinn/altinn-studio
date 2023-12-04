/// <reference types="cypress" />
/// <reference types="../../support" />

import { header } from '../../selectors/header';
import { datamodel } from '../../selectors/datamodel';
import * as texts from '../../../../../language/src/nb.json';
import * as testids from '../../../../testids';

context('datamodel', () => {
  before(() => {
    cy.deleteAllApps(Cypress.env('autoTestUser'), Cypress.env('accessToken'));
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

  it('Allows to add a datamodel, include an object with custom name and fields in it, and generate a C# model from it', () => {
    cy.intercept('PUT', /\/datamodels\//).as('updateDatamodel');

    datamodel.getCreateNewButton().click();
    cy.findByRole('textbox').type('datamodel');
    cy.findByRole('button', { name: texts['schema_editor.create_model_confirm_button'] }).click();
    cy.findByRole('button', { name: texts['schema_editor.add'] }).click();
    cy.findByRole('menuitem', { name: texts['schema_editor.object'] })
      .should('exist')
      .click()
      .then(() => {
        datamodel.getProperty('name0').should('exist');
        datamodel.getNameField().clear().type('test').blur();
        cy.wait('@updateDatamodel');
        datamodel.getNameField().invoke('val').should('eq', 'test');
        datamodel.getProperty('test').should('exist').click();
      });

    const addFieldToTestObject = () =>
      datamodel
        .getProperty(/^test($| )/)
        .within(() =>
          cy
            .findAllByRole('button', { name: texts['schema_editor.open_action_menu'] })
            .first()
            .click(),
        );

    // Add text1
    addFieldToTestObject();
    cy.findByRole('menuitem', { name: texts['schema_editor.add_field'] })
      .should('exist')
      .click()
      .then(() => {
        datamodel.getProperty('name0').should('exist');
        datamodel.getNameField().clear().type('text1').blur();
        cy.wait('@updateDatamodel');
        datamodel.getNameField().invoke('val').should('eq', 'text1');
        datamodel.getProperty('text1').should('exist');
      });

    // Add text2
    addFieldToTestObject();
    cy.findByRole('menuitem', { name: texts['schema_editor.add_field'] })
      .should('exist')
      .click()
      .then(() => {
        datamodel.getProperty('name0').should('exist');
        datamodel.getNameField().clear().type('text2').blur();
        cy.wait('@updateDatamodel');
        datamodel.getNameField().invoke('val').should('eq', 'text2');
        datamodel.getProperty('text2').should('exist');
      });

    //Add number1
    addFieldToTestObject();
    cy.findByRole('menuitem', { name: texts['schema_editor.add_field'] })
      .should('exist')
      .click()
      .then(() => {
        datamodel.getProperty('name0').should('exist');
        datamodel.getTypeField().click();
        cy.findByRole('option', { name: texts['schema_editor.integer'] }).should('exist').click();
        datamodel.getTypeField().invoke('val').should('eq', texts['schema_editor.integer']);
        datamodel.getNameField().clear().type('number1').blur();
        cy.wait('@updateDatamodel');
        datamodel.getProperty('number1').should('exist');
      });

    // Generate model
    cy.findByRole('button', { name: texts['schema_editor.generate_model_files'] }).click();
    cy.findByRole('alert', { name: texts['schema_editor.model_generation_success'] }).should(
      'be.visible',
    );
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

  it('Allows to upload and then delete an XSD file', () => {
    cy.findAllByTestId(testids.fileSelectorInput)
      .first()
      .selectFile('src/fixtures/testdatamodel.xsd', { force: true });
    cy.findByRole('combobox', { name: texts['schema_editor.choose_model'] })
      .invoke('val')
      .should('match', /\/testdatamodel.schema.json$/)
      .then((value) => {
        cy.get(`option[value="${value}"]`).should('exist');
        cy.findByRole('button', { name: texts['schema_editor.delete_data_model'] }).click();
        cy.findByRole('button', { name: texts['schema_editor.confirm_deletion'] }).click();
        cy.get(`option[value="${value}"]`).should('not.exist');
      });
  });
});
