import * as texts from 'test/e2e/fixtures/texts.json';
import AppFrontend from 'test/e2e/pageobjects/app-frontend';

import { getInstanceIdRegExp } from 'src/utils';

const appFrontend = new AppFrontend();

describe('Message', () => {
  const instanceIdExpr = getInstanceIdRegExp();

  before(() => {
    cy.intercept('POST', `**/instances?instanceOwnerPartyId*`).as('createdInstance');
    cy.intercept('**/active', []).as('noActiveInstances');
    cy.startAppInstance(appFrontend.apps.frontendTest);
    cy.get(appFrontend.closeButton).should('be.visible');
  });

  it('Attachments List displays correct number of attachments', () => {
    cy.get(appFrontend.message['header']).should('exist');
    cy.wait('@createdInstance').then((xhr) => {
      const instanceMetadata = xhr.response?.body;
      const instanceGuid = instanceMetadata.id.split('/')[1];
      cy.fixture('attachment.json').then((data) => {
        data.instanceGuid = instanceGuid;
        instanceMetadata.data.push(data);
      });
      const interceptExpression = getInstanceIdRegExp({ postfix: '$' });
      cy.intercept('GET', interceptExpression, instanceMetadata);
    });
    cy.reload();
    cy.get(appFrontend.message['attachmentList'])
      .siblings('ul')
      .children('a')
      .then((attachments) => {
        cy.wrap(attachments).should('have.length', 1);
        cy.wrap(attachments).first().should('contain.text', texts.downloadAttachment);
        cy.get(appFrontend.attachmentIcon).should('be.visible');
      });
    cy.url().then((url) => {
      const instantiateUrl =
        Cypress.env('environment') === 'local'
          ? 'http://altinn3local.no/ttd/frontend-test'
          : 'https://ttd.apps.tt02.altinn.no/ttd/frontend-test/';
      const maybeInstanceId = instanceIdExpr.exec(url);
      const instanceId = maybeInstanceId ? maybeInstanceId[1] : 'instance-id-not-found';
      cy.get(appFrontend.startAgain).contains(instanceId).and('contain.text', appFrontend.apps.frontendTest);
      cy.get(appFrontend.startAgain).find('a').should('have.attr', 'href', instantiateUrl);
    });
    cy.get(appFrontend.sendinButton).should('be.visible');
  });
});
