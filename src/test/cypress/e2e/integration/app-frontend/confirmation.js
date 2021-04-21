/// <reference types='cypress' />
/// <reference types="../../support" />

import AppFrontend from '../../pageobjects/app-frontend';
import Common from '../../pageobjects/common'
import * as texts from '../../fixtures/texts.json'

const mui = new Common();
const appFrontend = new AppFrontend();

describe('Confirm', () => {
  before(() => {
    cy.compelteTask3Form();
  });

  it('Confirm page displays texts and attachments', () => {
    cy.get(appFrontend.backButton).should('be.visible');
    cy.get(appFrontend.sendinButton).should('be.visible').click();
    cy.get(appFrontend.confirmContainer).should('be.visible');
    cy.get(appFrontend.confirmBody).should('contain.text', texts.confirmBody);
    cy.get(appFrontend.confirmSendInButton).should('be.visible');
  });

});
