/// <reference types='cypress' />
/// <reference types="../../support" />

import AppFrontend from '../../pageobjects/app-frontend';

const appFrontend = new AppFrontend();

describe('WCAG', () => {
  it('WCAG test in stateless app', () => {
    cy.startAppInstance(Cypress.env('stateless'));
    cy.get(appFrontend.stateless.name).should('exist').and('be.visible');
    cy.testWcag();
  });

  it('WCAG test in data app', () => {
    cy.intercept('**/active', []).as('noActiveInstances');
    cy.startAppInstance(Cypress.env('multiData2Stage'));
    cy.get(appFrontend.closeButton).should('be.visible');
    cy.get(appFrontend.message['header']).should('exist');
    cy.testWcag();
    cy.intercept('**/api/layoutsettings/changename').as('getLayoutChangeName');
    cy.get(appFrontend.sendinButton).then((button) => {
      cy.get(button).should('be.visible').click();
      cy.wait('@getLayoutChangeName');
    });
    cy.get(appFrontend.changeOfName.newFirstName).should('be.visible').type('a').blur();
    cy.get(appFrontend.changeOfName.newLastName).should('be.visible').type('a').blur();
    cy.get(appFrontend.changeOfName.confirmChangeName).should('be.visible').find('input').check();
    cy.testWcag();
  });
});
