import texts from 'test/e2e/fixtures/texts.json';
import { AppFrontend } from 'test/e2e/pageobjects/app-frontend';

const appFrontend = new AppFrontend();

describe('Feedback', () => {
  beforeEach(() => {
    cy.intercept('**/api/layoutsettings/stateless').as('getLayoutStateless');
    cy.startAppInstance(appFrontend.apps.stateless);
    cy.wait('@getLayoutStateless');
    cy.get(appFrontend.stateless.name).should('exist').and('be.visible');
  });

  it('is possible to move app instance to feedback stage', () => {
    cy.startStateFullFromStateless();
    cy.intercept('PUT', '**/process/next').as('nextProcess');
    cy.get(appFrontend.sendinButton).click();
    cy.wait('@nextProcess').its('response.statusCode').should('eq', 200);
    cy.get(appFrontend.feedback).and('contain.text', texts.feedback);
  });
});
