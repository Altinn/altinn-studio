/// <reference types='cypress' />
/// <reference types="../../support" />

import AppFrontend from '../../pageobjects/app-frontend';

const appFrontend = new AppFrontend();

describe('WCAG', () => {
  it('WCAG test in data app', () => {
    cy.intercept('**/active', []).as('noActiveInstances');
    cy.startAppInstance(appFrontend.apps.frontendTest);
    cy.get(appFrontend.closeButton).should('be.visible');
    cy.get(appFrontend.message['header']).should('exist');
    cy.testWcag();
    cy.get(appFrontend.sendinButton).click();
    cy.get(appFrontend.changeOfName.newFirstName).should('be.visible').type('a').blur();
    cy.get(appFrontend.changeOfName.newLastName).should('be.visible').type('a').blur();
    cy.get(appFrontend.changeOfName.confirmChangeName).should('be.visible').find('input').check();
    cy.testWcag();
  });
});
