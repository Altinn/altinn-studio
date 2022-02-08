/// <reference types='cypress' />
/// <reference types="../../support" />

import AppFrontend from '../../pageobjects/app-frontend';

const appFrontend = new AppFrontend();

describe('Stateless', () => {
  beforeEach(() => {
    cy.startAppInstance(Cypress.env('stateless'));
    cy.get(appFrontend.stateless.name).should('exist').and('be.visible');
  });

  it('Prefill from Register and data processing', () => {
    cy.get('body').should('have.css', 'background-color', 'rgb(239, 239, 239)');
    cy.get(appFrontend.closeButton).should('not.exist');
    cy.get(appFrontend.stateless.name).invoke('val').should('not.be.empty');
    cy.get(appFrontend.stateless.number).should('have.value', '1364');
    cy.get(appFrontend.stateless.name).clear().type('test').blur();
    cy.get(appFrontend.stateless.name).should('have.value', 'automation');
  });

  it('Dynamics in stateless app', () => {
    cy.get(appFrontend.stateless.name).clear().type('automation').blur();
    cy.get(appFrontend.stateless.idnummer2).should('exist').and('be.visible');
    cy.get(appFrontend.stateless.name).clear().type('abc').blur();
    cy.get(appFrontend.stateless.idnummer2).should('not.exist');
  });

  it('Logout from appfrontend', () => {
    cy.get(appFrontend.profileIconButton).should('be.visible').click();
    cy.get(appFrontend.logOut).should('be.visible');
    cy.get(appFrontend.logOutLink).should('exist').and('be.visible');
  });

  it('is possible to start app instance from stateless app', () => {
    var userFirstName = Cypress.env('testUserName').includes('external')
      ? Cypress.env('externalFistName')
      : Cypress.env('firstName');
    cy.intercept('POST', '**/instances/create').as('createInstance');
    cy.intercept('**/api/layoutsettings/statefull').as('getLayoutSettings');
    cy.get(appFrontend.instantiationButton).should('be.visible').click();
    cy.wait('@createInstance').its('response.statusCode').should('eq', 201);
    cy.wait('@getLayoutSettings');
    cy.get(appFrontend.stateless.name).should('have.value', userFirstName);
    cy.get(appFrontend.stateless.idnumber).should('have.value', '1364');
    cy.get(appFrontend.sendinButton).should('be.visible');
  });
});
