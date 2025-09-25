import { AppFrontend } from 'test/e2e/pageobjects/app-frontend';

const appFrontend = new AppFrontend();

describe('Process/next', () => {
  it('Failed PDF generation should cause unknown error for old nuget versions', () => {
    cy.allowFailureOnEnd();
    cy.intercept('GET', '**/applicationmetadata', (req) =>
      req.reply((res) => {
        res.body.altinnNugetVersion = '8.0.0.0';
        res.send();
      }),
    );

    cy.goto('message');

    cy.intercept('PUT', '**/process/next*', (req) =>
      req.reply({ statusCode: 500, body: { detail: 'Pdf generation failed' } }),
    );

    cy.findByRole('button', { name: 'Send inn' }).click();
    cy.findByRole('heading', { name: 'Ukjent feil' }).should('exist');
  });

  it('Failed PDF generation should show toast for new nuget versions', () => {
    cy.intercept('GET', '**/applicationmetadata', (req) =>
      req.reply((res) => {
        res.body.altinnNugetVersion = '8.1.0.115';
        res.send();
      }),
    );

    cy.goto('message');

    cy.intercept('PUT', '**/process/next*', (req) =>
      req.reply({ statusCode: 500, body: { detail: 'Pdf generation failed' } }),
    );

    cy.findByRole('button', { name: 'Send inn' }).click();
    cy.get(appFrontend.toast).should('contain.text', 'Noe gikk galt under innsendingen, prøv igjen om noen minutter');
    cy.findByRole('heading', { name: 'Ukjent feil' }).should('not.exist');
  });
});
