/// <reference types='cypress' />
/// <reference types="../../support" />

import AppFrontend from '../../pageobjects/app-frontend';
import * as texts from '../../fixtures/texts.json';

const appFrontend = new AppFrontend();

describe('On Entry', () => {
  beforeEach(() => {
    cy.intercept('**/active', [
      {
        id: '512345/58f1af2b-a90f-4828-8bf6-38fa24c51379',
        lastChanged: '2021-04-06T14:11:02.6893987Z',
        lastChangedBy: 'Ola Nordman',
      },
    ]);
  });

  it('is possible to select an existing instance', () => {
    cy.startAppInstance(Cypress.env('multiData2Stage'));
    cy.get(appFrontend.closeButton).should('be.visible');
    cy.get(appFrontend.selectInstance.container).should('be.visible');
    cy.get(appFrontend.selectInstance.header).should('be.visible').should('contain.text', texts.alreadyStartedForm);
    cy.get(appFrontend.selectInstance.description)
      .should('be.visible')
      .should('contain.text', texts.continueOrStartNew);
    cy.get(appFrontend.selectInstance.tableBody)
      .find('tr')
      .should('have.length', 1)
      .first()
      .then((activeInstance) => {
        cy.get(activeInstance).find('td').eq(0).should('have.text', '04/06/2021');
        cy.get(activeInstance).find('td').eq(1).should('have.text', 'Ola Nordman');
        cy.get(activeInstance).find('td').eq(2).find('button').click();
        cy.url().should('contain', '512345/58f1af2b-a90f-4828-8bf6-38fa24c51379');
      });
  });

  it('is possible to create a new instance', () => {
    cy.startAppInstance(Cypress.env('multiData2Stage'));
    cy.get(appFrontend.closeButton).should('be.visible');
    cy.get(appFrontend.selectInstance.container).should('be.visible');
    cy.intercept('POST', `/ttd/frontend-test/instances?instanceOwnerPartyId*`).as('createdInstance');
    cy.get(appFrontend.selectInstance.newInstance).should('be.visible').click();
    cy.wait('@createdInstance').its('response.statusCode').should('eq', 201);
    cy.url().should('not.contain', '512345/58f1af2b-a90f-4828-8bf6-38fa24c51379');
  });
});
