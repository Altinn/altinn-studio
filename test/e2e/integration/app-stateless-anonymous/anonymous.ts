import texts from 'test/e2e/fixtures/texts.json';
import { AppFrontend } from 'test/e2e/pageobjects/app-frontend';

const appFrontend = new AppFrontend();

describe('Anonymous (stateless)', () => {
  beforeEach(() => {
    cy.intercept('**/api/layoutsettings/stateless').as('getLayoutStateless');
    cy.startAppInstance(appFrontend.apps.anonymousStateless, null);
    cy.wait('@getLayoutStateless');
    cy.get(appFrontend.stateless.name).should('exist').and('be.visible');
  });

  it('Prefill from data processing is fetched', () => {
    cy.get('body').should('have.css', 'background-color', 'rgb(239, 239, 239)');
    cy.get(appFrontend.closeButton).should('not.exist');
    cy.get(appFrontend.profileIconButton).should('not.exist');
    cy.get(appFrontend.stateless.name).invoke('val').should('be.empty');
    cy.get(appFrontend.stateless.number).should('have.value', '1234');
    cy.get(appFrontend.header)
      .should('contain.text', appFrontend.apps.anonymousStateless)
      .and('contain.text', texts.ttd);
  });

  it('should trigger data processing on changes in form fields', () => {
    cy.get(appFrontend.stateless.name).type('test').blur();
    cy.get(appFrontend.stateless.name).should('have.value', 'automation');
    cy.get(appFrontend.stateless.idnummer2).should('have.value', '1234567890');
  });
});
