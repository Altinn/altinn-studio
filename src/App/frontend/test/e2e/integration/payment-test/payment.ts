import 'cypress-iframe';

import path from 'path';

import { AppFrontend } from 'test/e2e/pageobjects/app-frontend';

import { PaymentStatus } from 'src/features/payment/types';
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

  describe('Successful payment', () => {
    beforeEach(() => {
      cy.findByRole('button', { name: /Til betaling/ }).click();
      cy.intercept({
        method: 'GET',
        url: '**/ttd/payment-test/instances/**/**/payment*',
      }).as('paymentInfoRequest');
    });

    it('should redirect to the payment page, then the successpage', () => {
      cy.url().should('match', /\/Task_2\/payment$/);
      cy.url().should('match', /\/ProcessEnd$/);
    });
    it('The PDF receipt should be visible and downloadable', () => {
      cy.url().should('match', /\/ProcessEnd$/);
      cy.findByRole('link', { name: /Betalingskvittering.pdf/ }).click();
      const downloadsFolder = Cypress.config('downloadsFolder');
      const downloadedFilename = path.join(downloadsFolder, 'Betalingskvittering.pdf');
      cy.readFile(downloadedFilename, 'binary', { timeout: 10000 }).should((fileContent) => {
        expect(fileContent).to.exist;
      });
    });
  });

  describe('Failed payment', () => {
    beforeEach(() => {
      cy.findByRole('button', { name: /Til betaling/ }).click();
    });

    it('Should display an alert telling the user that the payment failed', () => {
      cy.intercept(
        {
          method: 'GET',
          url: '**/ttd/payment-test/instances/**/**/payment*',
        },
        (req) => {
          req.continue((res) => {
            if (res.body && res.body.status) {
              res.body.status = PaymentStatus.Failed; // Example of modifying a specific field
            }
          });
        },
      ).as('paymentInfoRequest');
      cy.wait('@paymentInfoRequest').then((_) => {
        cy.get('div.ds-alert')
          .should('exist')
          .and('be.visible')
          .within(() => {
            // Check that the div contains the text 'Betalingen feilet' in one of its children
            cy.contains('Betalingen feilet').should('exist');
          });
      });
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
