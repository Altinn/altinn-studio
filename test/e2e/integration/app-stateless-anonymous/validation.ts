import * as texts from 'test/e2e/fixtures/texts.json';
import AppFrontend from 'test/e2e/pageobjects/app-frontend';
import Common from 'test/e2e/pageobjects/common';

const appFrontend = new AppFrontend();
const mui = new Common();

describe('Validation in anonymous stateless app', () => {
  beforeEach(() => {
    cy.startAppInstance(appFrontend.apps.anonymousStateless, true);
    cy.get(appFrontend.stateless.name).should('exist').and('be.visible');
  });

  it('Should show validation message for missing name', () => {
    cy.get(appFrontend.stateless.name).invoke('val').should('be.empty');
    cy.get(appFrontend.navButtons).contains(mui.button, 'next').click();

    const nameError = appFrontend.fieldValidationError.replace('field', appFrontend.stateless.name.substring(1));

    cy.get(appFrontend.stateless.name).should('be.visible');
    cy.get(nameError).should('be.visible').should('have.text', texts.requiredFieldName);
    cy.get(appFrontend.errorReport)
      .should('be.visible')
      .should('be.inViewport')
      .should('contain.text', texts.errorReport)
      .should('contain.text', texts.requiredFieldName);

    cy.get(appFrontend.stateless.name).type('Hello world');
    cy.get(nameError).should('not.exist');
    cy.get(appFrontend.errorReport).should('not.exist');

    cy.get(appFrontend.navButtons).contains(mui.button, 'next').click();
    cy.get(appFrontend.navButtons).should('not.exist');
  });
});
