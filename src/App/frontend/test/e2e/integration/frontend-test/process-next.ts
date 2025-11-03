import { AppFrontend } from 'test/e2e/pageobjects/app-frontend';
import { patchAltinnAppDataOnVisit } from 'test/e2e/support/utils';

const appFrontend = new AppFrontend();

describe('Process/next', () => {
  it.only('Failed PDF generation should cause unknown error for old nuget versions', () => {
    cy.allowFailureOnEnd();

    // First, navigate to the message page normally to get the URL
    cy.goto('message');

    // Now revisit the page with the patched AltinnAppData
    cy.url().then((url) => {
      cy.visit(url, {
        onBeforeLoad: patchAltinnAppDataOnVisit((data) => ({
          ...data,
          applicationMetadata: {
            ...data.applicationMetadata,
            altinnNugetVersion: '8.0.0.0',
          },
        })),
      });
    });

    // Wait for the page to load
    cy.findByRole('progressbar').should('not.exist');

    cy.intercept('PUT', '**/process/next*', (req) =>
      req.reply({ statusCode: 500, body: { detail: 'Pdf generation failed' } }),
    );

    cy.findByRole('button', { name: 'Send inn' }).click();
    cy.findByRole('heading', { name: 'Ukjent feil' }).should('exist');
  });

  it('Failed PDF generation should show toast for new nuget versions', () => {
    // First, navigate to the message page normally to get the URL
    cy.goto('message');

    // Now revisit the page with the patched AltinnAppData
    cy.url().then((url) => {
      cy.visit(url, {
        onBeforeLoad: patchAltinnAppDataOnVisit((data) => ({
          ...data,
          applicationMetadata: {
            ...data.applicationMetadata,
            altinnNugetVersion: '8.1.0.115',
          },
        })),
      });
    });

    // Wait for the page to load
    cy.findByRole('progressbar').should('not.exist');

    cy.intercept('PUT', '**/process/next*', (req) =>
      req.reply({ statusCode: 500, body: { detail: 'Pdf generation failed' } }),
    );

    cy.findByRole('button', { name: 'Send inn' }).click();
    cy.get(appFrontend.toast).should('contain.text', 'Noe gikk galt under innsendingen, prøv igjen om noen minutter');
    cy.findByRole('heading', { name: 'Ukjent feil' }).should('not.exist');
  });
});
