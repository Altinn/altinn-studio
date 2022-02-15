/// <reference types='cypress' />
/// <reference types="../../support" />

import AppFrontend from '../../pageobjects/app-frontend';

const appFrontend = new AppFrontend();

describe('Options', () => {

  beforeEach(() => {
    cy.navigateToChangeName();
  });

  it('is possible to retrieve options dynamically', () => {
    // Case: options are dynamicly refetched based on what the user selects as source
    cy.get(appFrontend.changeOfName.sources).should('be.visible');
    cy.get(appFrontend.changeOfName.reference).should('be.visible');
    cy.get(appFrontend.changeOfName.reference).select('nordmann');
    cy.get(appFrontend.changeOfName.reference).should('have.value', 'nordmann');

    // Select a different source, expect previous selction to be cleared and
    // new value to be selectable in the reference option 
    cy.get(appFrontend.changeOfName.sources).select('digdir');
    cy.get(appFrontend.changeOfName.reference).should('be.visible');
    cy.get(appFrontend.changeOfName.reference).should('have.value', '');
    cy.get(appFrontend.changeOfName.reference).select('salt');
    cy.get(appFrontend.changeOfName.reference).should('have.value', 'salt');
  });
});

