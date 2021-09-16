/// <reference types='cypress' />
/// <reference types="../../support" />

import AppFrontend from '../../pageobjects/app-frontend';
import * as texts from '../../fixtures/texts.json';

const appFrontend = new AppFrontend();

describe('Reportee selection', () => {
  beforeEach(() => {
    cy.fixture('allowed-parties.json').then((allowedParties) => {
      cy.fixture('validate-instantiation.json').then((validateInstantiationResponse) => {
        validateInstantiationResponse.validParties = allowedParties;
        cy.intercept('POST', `**/api/v1/parties/validateInstantiation?partyId=*`, {
          body: validateInstantiationResponse,
        });
      });
      cy.intercept('GET', `**/api/v1/parties?allowedtoinstantiatefilter=true`, {
        body: allowedParties,
      });
    });
  });

  it('Reportee selection in data app', () => {
    cy.startAppInstance(Cypress.env('multiData2Stage'));
    cy.get(appFrontend.reporteeSelection.appHeader).should('be.visible');
    cy.get(appFrontend.reporteeSelection.error).should('be.visible').contains(texts.selectNewReportee);
    cy.get(appFrontend.reporteeSelection.seeSubUnits).should('be.visible').click();
    cy.contains(appFrontend.reporteeSelection.subUnits, 'Bergen').should('be.visible');
    cy.contains(appFrontend.reporteeSelection.reportee, 'slettet').should('not.exist');
    cy.get(appFrontend.reporteeSelection.checkbox).eq(0).click();
    cy.contains(appFrontend.reporteeSelection.reportee, 'slettet').should('be.visible');
    cy.get(appFrontend.reporteeSelection.checkbox).eq(1).click();
    cy.get(appFrontend.reporteeSelection.seeSubUnits).should('not.exist');
    cy.get(appFrontend.reporteeSelection.searchReportee).should('be.visible').type('DDG');
    cy.get(appFrontend.reporteeSelection.reportee).should('have.length', 1).contains('DDG');
  });
});
