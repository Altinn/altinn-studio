import 'cypress-iframe';

import { AppFrontend } from 'test/e2e/pageobjects/app-frontend';

const appFrontend = new AppFrontend();

describe('Payment', () => {
  beforeEach(() => {
    cy.startAppInstance(appFrontend.apps.paymentTest, { authenticationLevel: '1' });

    cy.findByRole('radio', { name: /Jeg fyller ut skjemaet som søker/ }).click();
    cy.contains('button', 'Varer og tjenester').click();
    cy.findByRole('checkbox', { name: /Jeg har lest og forstått/ }).click();
    cy.findByRole('textbox', { name: /Klassenummer/ }).type('1');
    cy.findByRole('textbox', { name: /Varer\/tjenester/ }).type('test');
    cy.contains('button', 'Betalning og saksgangen vidare').click();
  });

  it('should display the payment button', () => {
    cy.findByRole('button', { name: /Til betaling/ }).should('be.visible');
  });

  // The app's fake payment processor sends the browser straight back to the app, and reports every payment as paid
  // when the payment page checks it.
  describe('Successful payment', () => {
    beforeEach(() => {
      cy.findByRole('button', { name: /Til betaling/ }).clickAndWaitForProcessNext();
    });

    it('moves the process on by itself once the payment has gone through', () => {
      cy.url({ timeout: 30_000 }).should('match', /\/ProcessEnd$/);
    });
    it('The PDF receipt should be visible', () => {
      cy.url({ timeout: 30_000 }).should('match', /\/ProcessEnd$/);
      cy.findByRole('link', { name: /Betalingskvittering.pdf/ }).should('be.visible');
    });
  });

  describe('Back during a payment attempt', () => {
    it('cancels the attempt and follows the process, which the fake processor moves on as paid', () => {
      // Nothing asks the processor, so the attempt stays open on the payment page
      cy.intercept('POST', '**/ttd/payment-test/instances/**/payment/check*', {
        statusCode: 502,
        body: { type: 'payment-processor-unavailable', status: 502 },
      });
      cy.intercept('POST', '**/ttd/payment-test/instances/**/payment/cancel*').as('cancelPayment');
      cy.findByRole('button', { name: /Til betaling/ }).clickAndWaitForProcessNext();

      cy.findByRole('button', { name: 'Fortsett til betaling' }).should('be.visible');
      cy.findByRole('button', { name: 'Tilbake' }).click();

      cy.wait('@cancelPayment').its('response.statusCode').should('eq', 200);
      cy.url({ timeout: 30_000 }).should('match', /\/ProcessEnd$/);
    });
  });

  describe('Failed payment', () => {
    beforeEach(() => {
      // As when the processor cannot create the payment: no attempt opens, and the task stays idle without a payment
      cy.intercept('POST', '**/ttd/payment-test/instances/**/actions*', {
        statusCode: 500,
        body: { success: false, error: { code: 'PaymentNotStarted' } },
      });
      cy.findByRole('button', { name: /Til betaling/ }).clickAndWaitForProcessNext();
    });

    it('tells the user that the payment failed, and offers to pay again or go back', () => {
      cy.findByText('Betalingen feilet').should('be.visible');
      cy.findByRole('button', { name: 'Betal' }).should('be.visible');
      cy.findByRole('button', { name: 'Tilbake' }).should('be.visible');
    });

    it('goes back to the form', () => {
      cy.findByRole('button', { name: 'Tilbake' }).clickAndWaitForProcessNext();
      cy.url().should('match', /\/Task_1\//);
    });
  });
});

describe('PaymentInformation component', () => {
  it('should re-fetch stale data when rendering the component for the first time after the relevant data in the datamodel has changed', () => {
    cy.startAppInstance(appFrontend.apps.paymentTest, { authenticationLevel: '1' });

    cy.findByRole('radio', { name: /Jeg fyller ut skjemaet som søker/ }).click();
    // hiding the payment details component on the page where the orderlines are created in order to test the
    // payment information component fetching order details on first render. Another payment details component exists
    // on the last page of the data task, where this test is being performed.
    cy.findByRole('checkbox', { name: /Hide Payment Details component during filling out order-lines/ }).check();

    cy.contains('button', 'Varer og tjenester').click();
    cy.findByRole('checkbox', { name: /Jeg har lest og forstått/ }).click();
    cy.findByRole('textbox', { name: /Klassenummer/ }).type('1');
    cy.findByRole('textbox', { name: /Varer\/tjenester/ }).type('test');
    cy.contains('button', 'Betalning og saksgangen vidare').click();

    cy.findByRole('row', { name: /1 - test 1 1000 NOK/ }).should('exist');
  });
});
