/// <reference types="cypress" />
/// <reference types="../../support" />

import * as texts from '../../../../../language/src/nb.json';

const designerAppId = `${Cypress.env('autoTestUser')}/${Cypress.env('designerAppName')}`;
const orgAppId = `${Cypress.env('orgUserName')}/${Cypress.env('designerAppName')}`;

const FeatureFlagEnum = Object.freeze({
  ProcessEditor: 'processEditor',
});

context('Overview', () => {
  before(() => {
    cy.deleteAllApps(Cypress.env('autoTestUser'), Cypress.env('accessToken'));
    cy.deleteApp(
      Cypress.env('orgUserName'),
      Cypress.env('designerAppName'),
      Cypress.env('accessToken'),
    );
    cy.studioLogin(Cypress.env('autoTestUser'), Cypress.env('autoTestUserPwd'));
    cy.createApp(Cypress.env('autoTestUser'), Cypress.env('designerAppName'));
    cy.createApp(Cypress.env('orgFullName'), Cypress.env('designerAppName'));
  });
  beforeEach(() => {
    cy.visit('/dashboard');
  });

  after(() => {
    cy.deleteApp(
      Cypress.env('orgUserName'),
      Cypress.env('designerAppName'),
      Cypress.env('accessToken'),
    );
  });

  it('loads the overview page when navigating to app owned by a private person', () => {
    cy.visit('/editor/' + designerAppId);
    cy.findByText(Cypress.env('designerAppName')).should('be.visible');
    cy.findByText(texts['app_publish.private_app_owner']).should('be.visible');
    cy.findByText(texts['overview.navigation_title']).should('be.visible');
    cy.findByText(texts['overview.documentation.title']).should('be.visible');
    cy.findByText(texts['overview.news_title']).should('be.visible');
  });

  it('loads the overview page when navigating to app owned by org that is deployed to environments', () => {
    cy.visit('/editor/' + orgAppId);
    cy.findByText(Cypress.env('designerAppName')).should('be.visible');
    cy.findByRole('heading', { name: 'tt02' }).should('be.visible');
    cy.findByText(texts['overview.activity']).should('be.visible');
    cy.findByText(texts['overview.navigation_title']).should('be.visible');
    cy.findByText(texts['overview.documentation.title']).should('be.visible');
    cy.findByText(texts['overview.news_title']).should('be.visible');
  });

  it('should be possible to navigate to the forms builder from overview page', () => {
    cy.visit('/editor/' + designerAppId);
    const navigationContainer = cy.findByText(texts['overview.navigation_title']).parent();
    navigationContainer
      .findByRole('link', { name: texts['top_menu.create'] })
      .should('be.visible')
      .click();
    cy.findByText(texts['left_menu.components']).should('be.visible');
    cy.findByText(texts['ux_editor.no_components_selected']).should('be.visible');
  });

  it('should be possible to navigate to the data model editor from overview page', () => {
    cy.visit('/editor/' + designerAppId);
    const navigationContainer = cy.findByText(texts['overview.navigation_title']).parent();
    navigationContainer
      .findByRole('link', { name: texts['top_menu.datamodel'] })
      .should('be.visible')
      .click();
    cy.findByText(texts['app_data_modelling.landing_dialog_header']).should('be.visible');
  });

  it('should be possible to navigate to the text editor from overview page', () => {
    cy.visit('/editor/' + designerAppId);
    const navigationContainer = cy.findByText(texts['overview.navigation_title']).parent();
    navigationContainer
      .findByRole('link', { name: texts['top_menu.texts'] })
      .should('be.visible')
      .click();
    cy.findByText(texts['text_editor.new_text']).should('be.visible');
    cy.findByText(texts['text_editor.search_for_text']).should('be.visible');
  });

  it('should be possible to navigate to the process editor from overview page', () => {
    cy.visit('/editor/' + designerAppId);
    const navigationContainer = cy.findByText(texts['overview.navigation_title']).parent();
    navigationContainer
      .findByRole('link', { name: `${texts['top_menu.process-editor']} ${texts['general.beta']}` }) // Name is saved as "Prosess Beta" because of the "beta"-flag
      .should('be.visible')
      .click();
    cy.findByText(texts['process_editor.configuration_panel_no_task']).should('be.visible');
  });
});
