/// <reference types="cypress" />
/// <reference types="../../support" />

import { dashboard } from '../../pageobjects/dashboard';
import { designer } from '../../pageobjects/designer';

context('datamodel', () => {
  before(() => {
    cy.deleteallapps(Cypress.env('autoTestUser'), Cypress.env('accessToken'));
    cy.visit('/');
    cy.studiologin(Cypress.env('autoTestUser'), Cypress.env('autoTestUserPwd'));
    cy.createapp(Cypress.env('autoTestUser'), 'datamodel-app');
  });

  beforeEach(() => {
    cy.visit('/dashboard');
    cy.searchAndOpenApp(`${Cypress.env('autoTestUser')}/datamodel-app`);

    // Navigate to datamodels page and close dialog
    cy.findByRole('link', { name: designer.appMenu.datamoodelText }).click();
    cy.findByText('Lukk').click();
  });

  after(() => {
    cy.deleteallapps(Cypress.env('autoTestUser'), Cypress.env('accessToken'));
  });

  it('add a new data model', () => {
    cy.findByText('Lag en ny datamodell').click();
    cy.findByRole('textbox').type('datamodel');
    cy.findByRole('button', { name: 'Opprett modell' }).click();
    cy.findByRole('button', { name: 'Rediger' }).click();
    cy.findByText('property1').click();
  });

  it('edit a data model', () => {
    cy.findByText('property1').click();
    cy.findByRole('textbox', { name: 'Navn' }).clear().type('myProperty');
    cy.findByRole('combobox', { name: 'Type' }).invoke('value', 'integer');
  });
});
