import { AppFrontend } from 'test/e2e/pageobjects/app-frontend';

const appFrontend = new AppFrontend();

describe('Person lookup component', () => {
  it('Renders the person lookup component with correct text', () => {
    cy.intercept('POST', '/ttd/component-library/api/v1/lookup/person', {
      statusCode: 200,
      body: {
        success: true,
        personDetails: {
          ssn: '08829698278',
          name: 'Rik Forelder',
          firstName: 'Rik',
          middleName: '',
          lastName: 'Forelder',
        },
      },
    }).as('successfullyFetchedPerson');

    cy.startAppInstance(appFrontend.apps.componentLibrary, { authenticationLevel: '2' });
    cy.gotoNavPage('PersonLookupPage');

    // Check that the component is rendered
    cy.findByText(/Her legger du inn etternavn og fødselsnummer/i).should('exist');
    cy.findByRole('button', { name: /Hjelpetekst for legg til person/i }).should('exist');
    cy.findByRole('textbox', { name: /Fødselsnummer/i }).should('exist');
    cy.findByRole('textbox', { name: /Etternavn/i }).should('exist');
    cy.findByRole('button', { name: /Hent opplysninger/i }).should('exist');

    //Type invalid fnr
    cy.findByRole('textbox', { name: /Fødselsnummer/i }).type('123456789');
    cy.findByRole('textbox', { name: /Fødselsnummer/i }).blur();
    cy.findByText(/fødselsnummeret\/d-nummeret er ugyldig./i).should('exist');

    //Type valid fnr
    cy.findByRole('textbox', { name: /Fødselsnummer/i }).clear();
    cy.findByRole('textbox', { name: /Fødselsnummer/i }).type('08829698278');
    cy.findByRole('textbox', { name: /Fødselsnummer/i }).blur();
    cy.findByText(/fødselsnummeret\/d-nummeret er ugyldig./i).should('not.exist');

    // Try to get info without setting a surname
    cy.findByRole('button', { name: /Hent opplysninger/i }).click();
    cy.findByText(/etternavn må være minst 2 tegn langt/i).should('exist');

    // Type valid surname
    cy.findByRole('textbox', { name: /Etternavn/i }).type('Test');
    cy.findByRole('textbox', { name: /Etternavn/i }).blur();
    cy.findByText(/etternavn må være minst 2 tegn langt/i).should('not.exist');

    // Fetch person successfully
    cy.findByRole('button', { name: /Hent opplysninger/i }).click();
    cy.wait('@successfullyFetchedPerson');
    cy.findByRole('button', { name: /Fjern/i }).should('exist');
    cy.findByRole('textbox', { name: /Fødselsnummer/i, description: /Fra folkeregisteret/i }).should('exist');
    cy.findByRole('textbox', { name: /Navn/i, description: /Fra folkeregisteret/i }).should('exist');

    // Add intercept for failed fetch
    cy.intercept('POST', '/ttd/component-library/api/v1/lookup/person', {
      statusCode: 200,
      body: { success: false, personDetails: null },
    }).as('failedToGetPerson');

    // Remove person and fetch unsuccessfully
    cy.findByRole('button', { name: /Fjern/i }).click();
    cy.findByRole('textbox', { name: /Fødselsnummer/i }).type('08829698278');
    cy.findByRole('textbox', { name: /Etternavn/i }).type('Test');
    cy.findByRole('button', { name: /Hent opplysninger/i }).click();
    cy.wait('@failedToGetPerson');

    cy.findByText(
      /Ingen person er registrert med denne kombinasjonen av fødselsnummer\/D-nummer og navn. Vennligst kontroller feltene og prøv igjen./i,
    ).should('exist');

    cy.findByText(/Merk: Etter 5 feilforsøk blir søkemuligheten midlertidig sperret./i).should('exist');

    // Must be updated when backend returns better http status codes
    cy.intercept('POST', '/ttd/component-library/api/v1/lookup/person', {
      statusCode: 500,
      body: { success: false, personDetails: null },
    }).as('forbidden');

    cy.findByRole('button', { name: /Hent opplysninger/i }).click();
    cy.wait('@forbidden');

    cy.findByText(/Ukjent feil. Vennligst prøv igjen senere./i).should('exist');
  });
});
