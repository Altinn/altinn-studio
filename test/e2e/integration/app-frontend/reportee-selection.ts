import texts from 'test/e2e/fixtures/texts.json';
import { AppFrontend } from 'test/e2e/pageobjects/app-frontend';

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
    cy.intercept('**/active', []).as('noActiveInstances');
  });

  it('Reportee selection in data app', () => {
    cy.startAppInstance(appFrontend.apps.frontendTest);
    cy.get(appFrontend.reporteeSelection.appHeader).should('be.visible');
    cy.get(appFrontend.reporteeSelection.error).contains(texts.selectNewReportee);
    cy.get(appFrontend.reporteeSelection.seeSubUnits).click();
    cy.contains(appFrontend.reporteeSelection.subUnits, 'Bergen').should('be.visible');
    cy.contains(appFrontend.reporteeSelection.reportee, 'slettet').should('not.exist');
    cy.get(appFrontend.reporteeSelection.checkbox).eq(0).click();
    cy.contains(appFrontend.reporteeSelection.reportee, 'slettet').should('be.visible');
    cy.get(appFrontend.reporteeSelection.checkbox).eq(1).click();
    cy.get(appFrontend.reporteeSelection.seeSubUnits).should('not.exist');
    cy.get(appFrontend.reporteeSelection.searchReportee).type('DDG');
    cy.get(appFrontend.reporteeSelection.reportee).should('have.length', 1).contains('DDG');
  });
});
