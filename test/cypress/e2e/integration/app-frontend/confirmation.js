/// <reference types='cypress' />
/// <reference types="../../support" />

import AppFrontend from '../../pageobjects/app-frontend';
import * as texts from '../../fixtures/texts.json';

const appFrontend = new AppFrontend();

describe('Confirm', () => {
  it('Confirm page displays texts and attachments', () => {
    cy.completeTask3Form();
    cy.get(appFrontend.backButton).should('be.visible');
    cy.get(appFrontend.sendinButton).should('be.visible').click();
    cy.get(appFrontend.confirm.container).should('be.visible');
    cy.get(appFrontend.confirm.body).should('contain.text', texts.confirmBody);
    cy.get(appFrontend.confirm.receiptPdf)
      .find('a')
      .should('have.length', 3)
      .first()
      .should('contain.text', `${Cypress.env('multiData2Stage')}.pdf`);

    cy.get(appFrontend.confirm.uploadedAttachments)
      .last()
      .find('a')
      .should('have.length', 5)
      .should('contain.text', `test.pdf`)
      .should('contain.text', `attachment-in-single.pdf`)
      .should('contain.text', `attachment-in-multi1.pdf`)
      .should('contain.text', `attachment-in-multi2.pdf`)
      .should('contain.text', `attachment-in-nested.pdf`);

    cy.get(appFrontend.confirm.sendIn).should('be.visible');
    cy.url().then((url) => {
      var instanceId = url.split('/').slice(-2).join('/');
      cy.get(appFrontend.confirm.body).contains(instanceId).and('contain.text', Cypress.env('multiData2Stage'));
    });
  });
});
