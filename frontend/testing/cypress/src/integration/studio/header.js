import * as texts from '../../../../../language/src/nb.json';
import { localChanges } from '../../selectors/localChanges';

context('Header', () => {
  before(() => {
    cy.deleteAllApps(Cypress.env('autoTestUser'), Cypress.env('accessToken'));
    cy.studioLogin(Cypress.env('autoTestUser'), Cypress.env('autoTestUserPwd'));
    cy.createApp(Cypress.env('autoTestUser'), Cypress.env('designerAppName'));
  });
  beforeEach(() => {
    cy.visit('/dashboard');
    cy.goToApp(Cypress.env('autoTestUser'), Cypress.env('designerAppName'));
  });
  after(() => {
    cy.deleteAllApps(Cypress.env('autoTestUser'), Cypress.env('accessToken'));
  });

  it('is possible to delete local changes', () => {
    localChanges.getThreeDotsMenu().click();
    localChanges.getLocalChangesElement().click();
    localChanges.getHeader().should('be.visible');
    localChanges.getDownloadChangesLink().should('be.visible');
    localChanges.getDownloadAllLink().should('be.visible');
    localChanges.getDeleteChangesButton().should('be.visible').click();
    localChanges.getConfirmRepoNameField().type('test');
    localChanges.getConfirmDeleteButton().should('be.disabled');
    localChanges.getConfirmRepoNameField().clear();
    localChanges.getConfirmRepoNameField().type(`${Cypress.env('designerAppName')}`);
    localChanges.getConfirmDeleteButton().should('be.enabled').click();
    cy.findByText(texts['overview.reset_repo_completed']).should('be.visible');
  });
});
