/// <reference types="cypress" />
/// <reference types="../../support" />

import * as texts from '../../../../../language/src/nb.json';

const designerAppId = `${Cypress.env('autoTestUser')}/${Cypress.env('designerAppName')}`;
const orgAppId = `${Cypress.env('orgUserName')}/${Cypress.env('designerAppName')}`;
const NEW_ADM_FEATURE_FLAG = 'newAdministration';
const PROCESS_EDITOR_FEATURE_FLAG = 'processEditor';

context('Designer', () => {
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

  it('loads the overview page when navigating to app for user with no environments', () => {
    // Ensure feature flag is toggled
    // TODO: remove this once feature flag is removed (https://github.com/Altinn/altinn-studio/issues/11495)
    cy.visitWithFeatureFlag('/editor/' + designerAppId, NEW_ADM_FEATURE_FLAG);
    cy.findByText(Cypress.env('designerAppName')).should('be.visible');
    cy.findByText(texts['app_publish.no_env_title']).should('be.visible');
    cy.findByText(texts['administration.navigation_title']).should('be.visible');
    cy.findByText(texts['administration.documentation.title']).should('be.visible');
    cy.findByText(texts['administration.news_title']).should('be.visible');
  });

  it('loads the overview page when navigating to app for org with environments', () => {
    // Ensure feature flag is toggled
    // TODO: remove this once feature flag is removed (https://github.com/Altinn/altinn-studio/issues/11495)
    cy.visitWithFeatureFlag('/editor/' + orgAppId, NEW_ADM_FEATURE_FLAG);
    cy.findByText(Cypress.env('designerAppName')).should('be.visible');
    cy.findByRole('heading', { name: 'tt02' }).should('be.visible');
    cy.findByText(texts['administration.activity']).should('be.visible');
    cy.findByText(texts['administration.navigation_title']).should('be.visible');
    cy.findByText(texts['administration.documentation.title']).should('be.visible');
    cy.findByText(texts['administration.news_title']).should('be.visible');
  });

  it('should be possible to navigate to the forms builder from overview page', () => {
    // Ensure feature flag is toggled
    // TODO: remove this once feature flag is removed (https://github.com/Altinn/altinn-studio/issues/11495)
    cy.visitWithFeatureFlag('/editor/' + designerAppId, NEW_ADM_FEATURE_FLAG);
    const navigationContainer = cy.findByText(texts['administration.navigation_title']).parent();
    navigationContainer
      .findByRole('link', { name: texts['top_menu.create'] })
      .should('be.visible')
      .click();
    cy.findByText(texts['left_menu.components']).should('be.visible');
    cy.findByText(texts['ux_editor.no_components_selected']).should('be.visible');
  });

  it('should be possible to navigate to the data model editor from overview page', () => {
    // Ensure feature flag is toggled
    // TODO: remove this once feature flag is removed (https://github.com/Altinn/altinn-studio/issues/11495)
    cy.visitWithFeatureFlag('/editor/' + designerAppId, NEW_ADM_FEATURE_FLAG);
    const navigationContainer = cy.findByText(texts['administration.navigation_title']).parent();
    navigationContainer
      .findByRole('link', { name: texts['top_menu.datamodel'] })
      .should('be.visible')
      .click();
    cy.findByText(texts['app_data_modelling.landing_dialog_header']).should('be.visible');
  });

  it('should be possible to navigate to the text editor from overview page', () => {
    // Ensure feature flag is toggled
    // TODO: remove this once feature flag is removed (https://github.com/Altinn/altinn-studio/issues/11495)
    cy.visitWithFeatureFlag('/editor/' + designerAppId, NEW_ADM_FEATURE_FLAG);
    const navigationContainer = cy.findByText(texts['administration.navigation_title']).parent();
    navigationContainer
      .findByRole('link', { name: texts['top_menu.texts'] })
      .should('be.visible')
      .click();
    cy.findByText(texts['text_editor.new_text']).should('be.visible');
    cy.findByText(texts['text_editor.search_for_text']).should('be.visible');
  });

  it('should be possible to navigate to the process editor from overview page', () => {
    // Ensure feature flag is toggled BOTH for new administration AND process editor
    // TODO: remove this once feature flag is removed (https://github.com/Altinn/altinn-studio/issues/11495)
    cy.visitWithFeatureFlag(
      '/editor/' + designerAppId,
      `${NEW_ADM_FEATURE_FLAG},${PROCESS_EDITOR_FEATURE_FLAG}`,
    );
    const navigationContainer = cy.findByText(texts['administration.navigation_title']).parent();
    navigationContainer
      .findByRole('link', { name: `${texts['top_menu.process-editor']} ${texts['general.beta']}` })
      .should('be.visible')
      .click();
    cy.findByText(texts['process_editor.edit_mode']).should('be.visible');
  });
});
