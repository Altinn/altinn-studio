/// <reference types="cypress" />
/// <reference types="../../support" />

import * as texts from '../../../../../language/src/nb.json';
import { accessControlTab } from '../../selectors/accessControlTab';
import { administrationTab } from '../../selectors/administrationTab';
import { policyEditorTab } from '../../selectors/policyEditorTab';
import { settingsTab } from '../../selectors/settingsTab';

const designerAppId = `${Cypress.env('autoTestUser')}/${Cypress.env('designerAppName')}`;

context('SettingsModal', () => {
  before(() => {
    cy.deleteAllApps(Cypress.env('autoTestUser'), Cypress.env('accessToken'));
    cy.studioLogin(Cypress.env('autoTestUser'), Cypress.env('autoTestUserPwd'));
    cy.createApp(Cypress.env('autoTestUser'), Cypress.env('designerAppName'));
  });
  beforeEach(() => {
    cy.visit('/dashboard');
    // Navigate to designerApp
    cy.visit('/editor/' + designerAppId);
    cy.openSettingsModal();
  });
  after(() => {
    cy.deleteAllApps(Cypress.env('autoTestUser'), Cypress.env('accessToken'));
  });

  it('is possible to open the settings modal', () => {
    cy.findByRole('heading', { name: texts['settings_modal.heading'] }).should('be.visible');
  });

  it('is possible to close the settings modal', () => {
    cy.findByRole('button', { name: texts['modal.close_icon'] }).click();
    cy.findByRole('heading', { name: texts['settings_modal.heading'] }).should('not.exist');
  });

  it('is possible to see and edit information on About App tab', () => {
    administrationTab.getHeader().should('be.visible');
    administrationTab.getAppNameField().clear().type('New app name');
    administrationTab.getAppNameField().invoke('val').should('contain', 'New app name');
  });

  it('is possible to toggle settings on app settings tab', () => {
    settingsTab.getTab().click();
    settingsTab.getHeader().should('be.visible');
    settingsTab.getAutoDelete().should('be.visible');
    settingsTab.getEnableCopyInstance().should('be.visible');
    settingsTab.getHideInInbox().should('be.visible');
    settingsTab.getShowStartedInstances().should('be.visible');
  });

  it('is possible to load the policy editor tab', () => {
    // This test only loads the tab and tests that it loads as expected.
    // We should implement a separate test for the poloicy editor.
    policyEditorTab.getTab().click();
    policyEditorTab.getHeader().should('be.visible');
    policyEditorTab.getSecurityLevelSelect().should('be.visible');
  });

  it('is possible to update settings on the access control tab', () => {
    accessControlTab.getTab().click();
    accessControlTab.getHeader().should('be.visible');
    accessControlTab.getOrganisationParty().should('be.visible');
    accessControlTab.getPersonParty().should('be.visible');
    accessControlTab.getSubUnitParty().should('be.visible');
    accessControlTab.getBankruptcyParty().should('be.visible').click();
    accessControlTab.getBankruptcyPartyCheckbox().should('be.checked');

    // Close modal and re-open to confirm data is set as expected
    cy.findByRole('button', { name: texts['modal.close_icon'] }).click();
    cy.openSettingsModal();
    accessControlTab.getTab().click();
    accessControlTab.getBankruptcyPartyCheckbox().should('be.checked');
  });
});
