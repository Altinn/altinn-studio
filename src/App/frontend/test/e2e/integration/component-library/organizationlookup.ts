import { AppFrontend } from 'test/e2e/pageobjects/app-frontend';

const appFrontend = new AppFrontend();

const organizationLookupIntercept = '**/api/v1/lookup/organisation/*';

describe('Organization lookup', () => {
  it('Renders the organization lookup component correctly', () => {
    cy.intercept('GET', organizationLookupIntercept, {
      statusCode: 200,
      body: {
        success: true,
        organisationDetails: {
          orgNr: '043871668',
          name: 'Skog og Fjell Consulting',
        },
      },
    }).as('successfullyFetchedOrganisation');

    // Contrary to person looku, organization lookup does not require authentication level >2
    cy.startAppInstance(appFrontend.apps.componentLibrary, { authenticationLevel: '1' });
    cy.gotoNavPage('OrganisationLookupPage');

    // Check that the component is rendered
    cy.findByText(/Her legger du inn organisasjonsnummer/i).should('exist');
    cy.findByRole('button', { name: /Hjelpetekst for legg til virksomhet/i }).should('exist');
    cy.findByRole('textbox', { name: /Organisasjonsnummer/i }).should('exist');
    cy.findByRole('button', { name: /Hent opplysninger/i }).should('exist');

    cy.findByRole('textbox', { name: /Organisasjonsnummer/i }).type('043871668');
    cy.findByRole('textbox', { name: /Organisasjonsnummer/i }).blur();
    cy.findByRole('button', { name: /Hent opplysninger/i }).click();
    cy.wait('@successfullyFetchedOrganisation');
    cy.findByRole('button', { name: /Fjern/i }).should('exist');
    cy.findByRole('textbox', { name: /Organisasjonsnummer/i, description: /Fra enhetsregisteret/i }).should('exist');
    cy.findByLabelText('Organisasjonsnavn').within(() => {
      cy.findByText(/Skog og Fjell Consulting/i).should('exist');
    });

    // Remove organization
    cy.findByRole('button', { name: /Fjern/i }).click();
    cy.findByRole('button', { name: /Fjern/i }).should('not.exist');

    // Add interceptor for failed fetch
    cy.intercept('GET', organizationLookupIntercept, {
      statusCode: 200,
      body: {
        success: false,
        organisationDetails: null,
      },
    }).as('failedFetchOrganisation');

    // Fetch organization that does not exist
    cy.findByRole('textbox', { name: /Organisasjonsnummer/i }).type('043871668');
    cy.findByRole('button', { name: /Hent opplysninger/i }).click();
    cy.wait('@failedFetchOrganisation');
    cy.findByText(/Organisasjonsnummeret ble ikke funnet i enhetsregisteret/i).should('exist');

    // Add interceptor for failed fetch due to server error
    cy.intercept('GET', organizationLookupIntercept, {
      statusCode: 500,
    }).as('failedFetchOrganisationServerError');

    // Fetch organization with server error
    cy.findByRole('button', { name: /Hent opplysninger/i }).click();
    cy.wait('@failedFetchOrganisationServerError');
    cy.findByText(/Ukjent feil. Vennligst prøv igjen senere/i).should('exist');

    // Type invalid orgNr
    cy.findByRole('textbox', { name: /Organisasjonsnummer/i }).numberFormatClear();
    cy.findByRole('textbox', { name: /Organisasjonsnummer/i }).type('123456789');
    cy.findByRole('button', { name: /Hent opplysninger/i }).click();
    cy.findByText(/Organisasjonsnummeret er ugyldig/i).should('exist');

    cy.changeLayout((component) => {
      if (component.type === 'OrganizationLookup') {
        component.showValidations = ['All'];
      }
    });

    // The component and Summary2 show the validation, but ErrorReport stays hidden until a validation boundary.
    cy.findAllByText('Du må fylle ut organisasjonsnummer og hente opplysninger').should('exist').and('have.length', 2);
    cy.get(appFrontend.errorReport).should('not.exist');

    cy.changeLayout((component) => {
      if (component.type === 'OrganizationLookup') {
        component.showValidations = undefined;
      }
      if (component.type === 'NavigationButtons') {
        component.validateOnNext = { page: 'current', show: ['All'] };
      }
    });

    cy.findAllByText('Du må fylle ut organisasjonsnummer og hente opplysninger').should('not.exist');
    cy.findByRole('button', { name: 'Neste' }).click();

    cy.findAllByText('Du må fylle ut organisasjonsnummer og hente opplysninger').should('exist').and('have.length', 3);
  });
});
