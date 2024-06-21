import 'cypress-iframe';

import { faker } from '@faker-js/faker';
import path from 'path';

import { AppFrontend } from 'test/e2e/pageobjects/app-frontend';
const appFrontend = new AppFrontend();

describe.skip('Payment', () => {
  beforeEach(() => {
    cy.startAppInstance(appFrontend.apps.paymentTest, { authenticationLevel: '1' });
  });

  it('Should fill out the form, landing on the payment page', () => {
    cy.intercept({
      method: 'GET',
      url: '**/ttd/payment-test/*',
      query: {
        paymentid: '*',
      },
    }).as('paymentRequest');
    cy.findByRole('radio', { name: /Jeg fyller ut skjemaet som søker/ }).click();
    cy.contains('button', 'Varer og tjenester').click();
    cy.findByRole('checkbox', { name: /Jeg har lest og forstått/ }).click();
    cy.findByRole('textbox', { name: /Klassenummer/ }).type('1');
    cy.findByRole('textbox', { name: /Varer\/tjenester/ }).type('test');
    cy.contains('button', 'Betalning og saksgangen vidare').click();
    cy.findByRole('button', { name: /Til betaling/ }).click();
    cy.intercept({
      method: 'GET',
      url: '**/ttd/payment-test/instances/**/**/payment*',
    }).as('paymentInfoRequest');

    cy.wait('@paymentInfoRequest').then((_) => {
      cy.url().then((url) => {
        cy.log(`Current URL is: ${url}`);

        cy.enter('#nets-checkout-iframe').then((getBody) => {
          getBody().find('#registrationManualEmail').should('be.visible').type(faker.internet.email());
          getBody().find('#registrationManualPostalCode').should('be.visible').type('2072');
          getBody().find('#registrationManualPhoneNumber').should('not.be.disabled').type('94257166');
          getBody().find('#registrationManualFirstName').should('not.be.disabled').type(faker.person.firstName());
          getBody().find('#registrationManualLastName').should('not.be.disabled').type(faker.person.firstName());
          getBody().find('#registrationManualAddressLine1').should('not.be.disabled').type('Grev Wedels plass 1');
          getBody().find('#registrationManualCity').should('not.be.disabled').type('Oslo');
        });

        cy.frameLoaded('#nets-checkout-iframe')
          .iframeCustom()
          .find('#easy-checkout-iframe')
          .iframeCustom()
          .find('#cardNumberInput')
          .type('5213199803453465');

        cy.frameLoaded('#nets-checkout-iframe')
          .iframeCustom()
          .find('#easy-checkout-iframe')
          .iframeCustom()
          .find('#cardExpiryInput')
          .type('1059');

        cy.frameLoaded('#nets-checkout-iframe')
          .iframeCustom()
          .find('#easy-checkout-iframe')
          .iframeCustom()
          .find('#cardCvcInput')
          .type('123');

        // eslint-disable-next-line cypress/no-unnecessary-waiting
        cy.wait(4000);
        cy.enter('#nets-checkout-iframe').then((getBody) => {
          getBody().find('#btnPay').should('exist').click();
        });
        // eslint-disable-next-line cypress/no-unnecessary-waiting
        cy.wait(4000);

        cy.enter('#nets-checkout-iframe').then(() => {
          cy.frameLoaded('#nets-checkout-iframe')
            .iframeCustom()
            .find('#nets-checkout-inception-iframe')
            .iframeCustom()
            .find('#AuthenticationSuccessButton')
            .click();
        });

        cy.wait('@paymentRequest').then((interception) => {
          // The reason we need this intercept is that NETS will call this URL after the payment is successful.
          // Our backend will just return a 302 NOT FOUND, but the test will break.
          // However, at this point we know the payment is successful, so we can then just visist that payment URL in
          // the next line if code below.
          expect(interception?.response?.statusCode).to.eq(302);
        });

        cy.visit(url);
        cy.findByRole('link', { name: /Betalingskvittering.pdf/ }).click();

        const downloadsFolder = Cypress.config('downloadsFolder');
        const downloadedFilename = path.join(downloadsFolder, 'Betalingskvittering.pdf');
        cy.readFile(downloadedFilename, 'binary', { timeout: 10000 });
      });
    });
  });
});
