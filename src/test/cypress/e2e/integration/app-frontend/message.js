/// <reference types='cypress' />

import AppFrontend from '../../pageobjects/app-frontend';
import * as texts from '../../fixtures/texts.json'

const appName = Cypress.env('localTestAppName');
const appFrontend = new AppFrontend();

describe('Message', () => {
  before(() => {
    cy.visit(Cypress.env('localTestBaseUrl'));
    cy.get(appFrontend.appSelection).select(appName);
    cy.get(appFrontend.startButton).click();
    cy.get(appFrontend.closeButton).should('be.visible');
  });

  it('Attachments List displays correct number of attachments', () => {
    cy.get(appFrontend.message['header']).should('exist');
    cy.getTokenForOrg('ttd').then(token => {
      cy.url().then(instance => {
        instance = instance.split('/');
        cy.uploadAttachment('ttd', 'frontend-test', instance[instance.length - 2], instance[instance.length - 1], 'fileUpload-message', token)
          .then(() => cy.reload());
      });
    });
    cy.get(appFrontend.message['attachmentList']).siblings('ul').children('a')
      .then((attachments) => {
        cy.get(attachments).should('have.length', 1);
        cy.get(attachments).first().should('contain.text', texts.downloadAttachment);
        cy.get(appFrontend.attachmentIcon).should('be.visible');
      });
  });

});
