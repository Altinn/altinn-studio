import texts from 'test/e2e/fixtures/texts.json';
import { AppFrontend } from 'test/e2e/pageobjects/app-frontend';

const appFrontend = new AppFrontend();

describe('Validation in anonymous stateless app', () => {
  it('Should show validation message for missing name', () => {
    cy.startAppInstance(appFrontend.apps.anonymousStateless, { cyUser: null });
    cy.get(appFrontend.stateless.name).should('exist').and('be.visible');
    cy.get(appFrontend.stateless.name).invoke('val').should('be.empty');
    cy.get(appFrontend.navButtons).contains('button', 'next').click();

    const nameError = appFrontend.fieldValidation(appFrontend.stateless.name);

    cy.get(appFrontend.stateless.name).should('be.visible');
    cy.get(nameError).should('have.text', texts.requiredFieldName);
    cy.get(appFrontend.errorReport)
      .should('be.inViewport')
      .should('contain.text', texts.errorReport)
      .should('contain.text', texts.requiredFieldName);

    cy.visualTesting('anonymous:validation');

    cy.get(appFrontend.stateless.name).type('Hello world');
    cy.get(nameError).should('not.exist');
    cy.get(appFrontend.errorReport).should('not.exist');

    cy.get(appFrontend.navButtons).contains('button', 'next').click();
    cy.get(appFrontend.navButtons).should('not.exist');
  });
});
