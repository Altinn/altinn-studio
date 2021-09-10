/// <reference types='cypress' />
/// <reference types="../../support" />

import AppFrontend from '../../pageobjects/app-frontend';
import * as texts from '../../fixtures/texts.json';

const appFrontend = new AppFrontend();

describe('Confirm', () => {
  it('Confirm page displays texts and attachments', () => {
    cy.compelteTask3Form();
    cy.get(appFrontend.backButton).should('be.visible');
    cy.intercept('GET', '**/orgs/altinn-orgs.json').as('getAltinnOrgs');
    cy.get(appFrontend.sendinButton).should('be.visible').click();
    cy.wait('@getAltinnOrgs');
    cy.get(appFrontend.confirmContainer).should('be.visible');
    cy.get(appFrontend.confirmBody).should('contain.text', texts.confirmBody);
    cy.get(appFrontend.confirmSendInButton).should('be.visible');
  });
});
