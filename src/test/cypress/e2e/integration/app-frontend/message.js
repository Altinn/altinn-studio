/// <reference types='cypress' />
/// <reference types="../../support" />

import AppFrontend from '../../pageobjects/app-frontend';
import * as texts from '../../fixtures/texts.json';

const appFrontend = new AppFrontend();

describe('Message', () => {
  let instanceMetadata, instanceId;
  before(() => {
    cy.intercept('POST', `**/instances?instanceOwnerPartyId*`).as('createdInstance');
    cy.intercept('**/active', []).as('noActiveInstances');
    cy.startAppInstance(Cypress.env('multiData2Stage'));
    cy.get(appFrontend.closeButton).should('be.visible');
  });

  it('Attachments List displays correct number of attachments', () => {
    cy.get(appFrontend.message['header']).should('exist');
    cy.wait('@createdInstance').then((xhr) => {
      instanceMetadata = xhr.response.body;
      instanceId = instanceMetadata.id.split('/')[1];
      cy.fixture('attachment.json').then((data) => {
        data.instanceGuid = instanceId;
        instanceMetadata.data.push(data);
      });
      cy.intercept(
        'GET',
        /[0-9]+\/*[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
        instanceMetadata,
      );
    });
    cy.reload();
    cy.get(appFrontend.message['attachmentList'])
      .siblings('ul')
      .children('a')
      .then((attachments) => {
        cy.get(attachments).should('have.length', 1);
        cy.get(attachments).first().should('contain.text', texts.downloadAttachment);
        cy.get(appFrontend.attachmentIcon).should('be.visible');
      });
    cy.url().then((url) => {
      var instantiateUrl =
        Cypress.env('environment') != 'local'
          ? 'https://ttd.apps.tt02.altinn.no/ttd/frontend-test/'
          : 'http://altinn3local.no/ttd/frontend-test';
      var instanceId = url.split('/').slice(-2).join('/');
      cy.get(appFrontend.startAgain).contains(instanceId).and('contain.text', Cypress.env('multiData2Stage'));
      cy.get(appFrontend.startAgain).find('a').should('have.attr', 'href', instantiateUrl);
    });
    cy.get(appFrontend.sendinButton)
      .should('be.visible')
      .invoke('outerWidth')
      .then((width) => {
        width = Math.round(width);
        expect(width).to.equal(112);
      });
  });
});
