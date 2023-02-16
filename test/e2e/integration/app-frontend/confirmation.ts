import texts from 'test/e2e/fixtures/texts.json';
import { AppFrontend } from 'test/e2e/pageobjects/app-frontend';

import { getInstanceIdRegExp } from 'src/utils/instanceIdRegExp';

const appFrontend = new AppFrontend();

describe('Confirm', () => {
  it('Confirm page displays texts and attachments', () => {
    cy.goto('confirm', 'with-data');
    cy.get(appFrontend.confirm.container).should('be.visible');
    cy.get(appFrontend.confirm.body).should('contain.text', texts.confirmBody);
    cy.get(appFrontend.confirm.receiptPdf)
      .find('a')
      .should('have.length', 5) // This is the number of process data tasks
      .first()
      .should('contain.text', `${appFrontend.apps.frontendTest}.pdf`);

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
      const maybeInstanceId = getInstanceIdRegExp().exec(url);
      const instanceId = maybeInstanceId ? maybeInstanceId[1] : 'instance-id-not-found';
      cy.get(appFrontend.confirm.body).contains(instanceId).and('contain.text', appFrontend.apps.frontendTest);
    });
  });
});
