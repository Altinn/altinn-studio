import { AppFrontend } from 'test/e2e/pageobjects/app-frontend';

const appFrontend = new AppFrontend();

describe('Organisation lookup', () => {
  it('Renders the organisation lookup component correctly', () => {
    cy.intercept('GET', '/ttd/component-library/api/v1/lookup/organisation/*', {
      statusCode: 200,
      body: {
        success: true,
        organisationDetails: {
          orgNr: '043871668',
          name: 'Skog og Fjell Consulting',
        },
      },
    }).as('successfullyFetchedOrganisation');

    // Contrary to person looku, organisation lookup does not require authentication level >2
    cy.startAppInstance(appFrontend.apps.componentLibrary, { authenticationLevel: '1' });
    cy.gotoNavPage('OrganisationLookupPage');

    // Check that the component is rendered
    cy.findByText(/Her legger du inn organisasjonsnummer/i).should('exist');
    cy.findByRole('button', { name: /Hjelpetekst for legg til virksomhet/i }).should('exist');
    cy.findByRole('textbox', { name: /Organisasjonsnummer/i }).should('exist');
    cy.findByRole('button', { name: /Hent opplysninger/i }).should('exist');

    // Type invalid orgNr
    cy.findByRole('textbox', { name: /Organisasjonsnummer/i }).type('123456789');
    cy.findByRole('textbox', { name: /Organisasjonsnummer/i }).blur();
    cy.findByText(/Organisasjonsnummeret er ugyldig/i).should('exist');

    // Type valid orgNr
    cy.findByRole('textbox', { name: /Organisasjonsnummer/i }).clear();
    cy.findByRole('textbox', { name: /Organisasjonsnummer/i }).type('043871668');
    cy.findByRole('textbox', { name: /Organisasjonsnummer/i }).blur();
    cy.findByText(/Organisasjonsnummeret er ugyldig/i).should('not.exist');

    // Fetch organisation
    cy.findByRole('button', { name: /Hent opplysninger/i }).click();
    cy.wait('@successfullyFetchedOrganisation');
    cy.findByRole('button', { name: /Fjern/i }).should('exist');
    cy.findByRole('textbox', { name: /Organisasjonsnummer/i, description: /Fra enhetsregisteret/i }).should('exist');
    cy.findByLabelText('Organisasjonsnavn').within(() => {
      cy.findByText(/Skog og Fjell Consulting/i).should('exist');
    });

    // Remove organisation
    cy.findByRole('button', { name: /Fjern/i }).click();
    cy.findByRole('button', { name: /Fjern/i }).should('not.exist');

    // Add interceptor for failed fetch
    cy.intercept('GET', '/ttd/component-library/api/v1/lookup/organisation/*', {
      statusCode: 200,
      body: {
        success: false,
        organisationDetails: null,
      },
    }).as('failedFetchOrganisation');

    // Fetch organisation that does not exist
    cy.findByRole('textbox', { name: /Organisasjonsnummer/i }).type('043871668');
    cy.findByRole('button', { name: /Hent opplysninger/i }).click();
    cy.wait('@failedFetchOrganisation');
    cy.findByText(/Organisasjonsnummeret ble ikke funnet i enhetsregisteret/i).should('exist');

    // Add interceptor for failed fetch due to server error
    cy.intercept('GET', '/ttd/component-library/api/v1/lookup/organisation/*', {
      statusCode: 500,
    }).as('failedFetchOrganisationServerError');

    // Fetch organisation with server error
    cy.findByRole('textbox', { name: /Organisasjonsnummer/i }).clear();
    cy.findByRole('textbox', { name: /Organisasjonsnummer/i }).type('043871668');
    cy.findByRole('button', { name: /Hent opplysninger/i }).click();
    cy.wait('@failedFetchOrganisationServerError');
    cy.findByText(/Ukjent feil. Vennligst prøv igjen senere/i).should('exist');
  });
});
