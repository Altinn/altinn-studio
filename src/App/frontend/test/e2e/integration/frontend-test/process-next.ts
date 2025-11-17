import { AppFrontend } from 'test/e2e/pageobjects/app-frontend';

const appFrontend = new AppFrontend();

describe('Process/next', () => {
  it('Failed PDF generation should show toast', () => {
    cy.goto('message');

    cy.intercept('PUT', '**/process/next*', (req) =>
      req.reply({ statusCode: 500, body: { detail: 'Pdf generation failed' } }),
    );

    cy.findByRole('button', { name: 'Send inn' }).click();
    cy.get(appFrontend.toast).should('contain.text', 'Noe gikk galt under innsendingen, prøv igjen om noen minutter');
    cy.findByRole('heading', { name: 'Ukjent feil' }).should('not.exist');
  });
});
