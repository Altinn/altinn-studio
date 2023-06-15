import texts from 'test/e2e/fixtures/texts.json';
import { AppFrontend } from 'test/e2e/pageobjects/app-frontend';

import { getInstanceIdRegExp } from 'src/utils/instanceIdRegExp';

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
    cy.findByRole('heading', { name: /Appen for test av app frontend/i }).should('exist');
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
          ? 'http://local.altinn.cloud/ttd/frontend-test'
          : 'https://ttd.apps.tt02.altinn.no/ttd/frontend-test/';
      const maybeInstanceId = instanceIdExpr.exec(url);
      const instanceId = maybeInstanceId ? maybeInstanceId[1] : 'instance-id-not-found';
      cy.get(appFrontend.startAgain).contains(instanceId);
      cy.get(appFrontend.startAgain).should('contain.text', appFrontend.apps.frontendTest);
      cy.get(appFrontend.startAgain).find('a:contains("her")').should('have.attr', 'href', instantiateUrl);

      cy.get('a:contains("Intern lenke i nytt vindu")')
        .should('have.attr', 'target', '_blank')
        .should('not.have.class', 'same-window')
        .should('not.have.class', 'target-external')
        .should('have.class', 'target-internal')
        .then(hasOpenInNewTabIconAfter(true));
      cy.get('a:contains("Intern lenke i samme vindu")')
        .should('have.class', 'same-window')
        .should('not.have.class', 'target-external')
        .should('have.class', 'target-internal')
        .then(hasOpenInNewTabIconAfter(false));
      cy.get('a:contains("Ekstern lenke i nytt vindu")')
        .should('have.attr', 'target', '_blank')
        .should('have.class', 'target-external')
        .should('not.have.class', 'target-internal')
        .should('not.have.class', 'same-window')
        .then(hasOpenInNewTabIconAfter(true));
      cy.get('a:contains("Ekstern lenke i samme vindu")')
        .should('have.class', 'same-window')
        .should('not.have.class', 'target-internal')
        .should('have.class', 'target-external')
        .then(hasOpenInNewTabIconAfter(false));
    });
    cy.get(appFrontend.sendinButton).should('be.visible');
  });
});

const hasOpenInNewTabIconAfter = (shouldHaveIcon: boolean) => ($element) => {
  cy.window().then((win) => {
    const after = win.getComputedStyle($element[0], '::after');
    const img = after.getPropertyValue('background-image');
    if (shouldHaveIcon) {
      expect(img).to.contain('data:image/svg+xml');
    } else {
      expect(img).to.equal('none');
    }
  });
};
