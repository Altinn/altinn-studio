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
    cy.goToApp(Cypress.env('autoTestUser'), Cypress.env('designerAppName'));

    // Navigate to datamodels page and close dialog
    header.getDatamodelLink().click();
  });

  after(() => {
    cy.deleteAllApps(Cypress.env('autoTestUser'), Cypress.env('accessToken'));
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
