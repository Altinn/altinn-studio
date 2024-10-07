import texts from 'test/e2e/fixtures/texts.json';
import { AppFrontend } from 'test/e2e/pageobjects/app-frontend';

const appFrontend = new AppFrontend();

describe('Stateless', () => {
  beforeEach(() => {
    cy.intercept('**/api/layoutsettings/stateless').as('getLayoutStateless');
    cy.startAppInstance(appFrontend.apps.stateless);
    cy.wait('@getLayoutStateless');
    cy.get(appFrontend.stateless.name).should('exist').and('be.visible');
  });

  it('Prefill from Register and data processing', () => {
    cy.get('body').should('have.css', 'background-color', 'rgb(239, 239, 239)');
    cy.get(appFrontend.closeButton).should('not.exist');
    cy.get(appFrontend.stateless.name).invoke('val').should('not.be.empty');
    cy.get(appFrontend.stateless.number).should('have.value', '1364');
    cy.get(appFrontend.stateless.name).clear();
    cy.get(appFrontend.stateless.name).type('test');
    cy.get(appFrontend.stateless.name).blur();
    cy.get(appFrontend.stateless.name).should('have.value', 'automation');
    cy.get(appFrontend.header).should('contain.text', appFrontend.apps.stateless).and('contain.text', texts.ttd);
    cy.snapshot('stateless');
  });

  it('Dynamics in stateless app', () => {
    cy.get(appFrontend.stateless.name).clear();
    cy.get(appFrontend.stateless.name).type('automation');
    cy.get(appFrontend.stateless.name).blur();
    cy.get(appFrontend.stateless.idnummer2).should('exist').and('be.visible');
    cy.get(appFrontend.stateless.name).clear();
    cy.get(appFrontend.stateless.name).type('abc');
    cy.get(appFrontend.stateless.name).blur();
    cy.get(appFrontend.stateless.idnummer2).should('not.exist');
  });

  it('Logout from appfrontend', () => {
    cy.get(appFrontend.profileIconButton).click();
    cy.get(appFrontend.logOut).should('be.visible');
    cy.get(appFrontend.logOutLink).should('exist').and('be.visible');
  });

  it('is possible to start app instance from stateless app', () => {
    const userFirstName = Cypress.env('defaultFirstName');
    cy.startStatefulFromStateless();
    cy.findByRole('textbox', { name: /navn/i }).should('have.value', userFirstName);
    cy.findByRole('textbox', { name: /id/i }).should('have.value', '1364');
    cy.findByRole('button', { name: /send inn/i }).should('be.visible');
  });

  it('back button should work after starting an instance', () => {
    cy.get(appFrontend.stateless.name).clear();
    cy.get(appFrontend.stateless.name).type('hello world');
    cy.get(appFrontend.stateless.number).clear();
    cy.get(appFrontend.stateless.number).type('6789');
    cy.get(appFrontend.instantiationButton).click();
    cy.findByRole('textbox', { name: /id/i }).should('have.value', '1364'); // Make sure we are on the correct page
    cy.window().then((win) => win.history.back());
    cy.get(appFrontend.stateless.name).should('have.value', 'hello world');
    cy.get(appFrontend.stateless.number).should('have.value', '6789');
  });
});
