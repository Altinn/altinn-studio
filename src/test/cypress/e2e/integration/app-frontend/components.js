/// <reference types='cypress' />
/// <reference types="../../support" />

import AppFrontend from '../../pageobjects/app-frontend';

const appFrontend = new AppFrontend();

describe('UI Components', () => {
  beforeEach(() => {
    cy.intercept('**/active', []).as('noActiveInstances');
    cy.startAppInstance(Cypress.env('multiData2Stage'));
    cy.get(appFrontend.closeButton).should('be.visible');
  });

  it('Image component with help text', () => {
    cy.get(appFrontend.message.logo)
      .should('be.visible')
      .then((image) => {
        cy.get(image).find('img').should('have.attr', 'alt', 'Altinn logo');
        cy.get(image)
          .parentsUntil(appFrontend.message.logoFormContent)
          .eq(1)
          .should('have.css', 'justify-content', 'center');
        cy.get(image).parent().siblings().find(appFrontend.helpText.open).parent().click();
        cy.get(appFrontend.helpText.alert).contains('Altinn logo').type('{esc}');
        cy.get(appFrontend.helpText.alert).should('not.exist');
      });
  });
});
