import { AppFrontend } from 'test/e2e/pageobjects/app-frontend';

const appFrontend = new AppFrontend();

describe('Subform test', () => {
  beforeEach(() => {
    cy.startAppInstance(appFrontend.apps.subformTest, { authenticationLevel: '1' });
  });

  it('should test all subform functionality', () => {
    // Verify main form url
    cy.url().should('include', '/ttd/subform-test');
    cy.url().should('include', '/Task_1/utfylling');

    //Add data to main form field
    const name = 'Jonas';
    cy.get('#Input-Name').should('be.visible').type(name);

    // Test process next when required subform is missing
    cy.get('[data-testid="NavigationButtons"] button.fds-btn--primary').contains('Neste').scrollIntoView();
    cy.get('[data-testid="NavigationButtons"] button.fds-btn--primary').should('be.visible').click();
    cy.get('[data-testid="ErrorReport"]').should('be.visible');

    // Navigate to the subform page
    cy.get('#subform-subform-mopeder-add-button').should('be.visible').click();

    // Verify subform url
    cy.url().should('include', '/ttd/subform-test');
    cy.url().should('include', '/Task_1/utfylling/subform-mopeder/');
    cy.url().should('include', '/moped-utfylling');

    // Test submitting subform with missing required fields
    cy.get('#custom-button-subform-moped-exitButton').click();
    cy.get('[data-testid="ErrorReport"]').should('be.visible');
    cy.get('#custom-button-subform-moped-cancelButton').should('contain', 'Avbryt');
    cy.get('#custom-button-subform-moped-exitButton').should('contain', 'Ferdig');

    // Fill out and submit the subform
    const regno = 'FQ2345213';
    const merke = 'Toyota';
    const model = 'Yaris';
    const year = '2004';
    const extrainfo = 'ekstra';
    cy.get('#moped-regno').type(regno);
    cy.get('#moped-merke').type(merke);
    cy.get('#moped-modell').type(model);
    cy.get('#moped-produksjonsaar').type(year);

    // Select "Ja" radio button to trigger an expression
    cy.get('#moped-extrainfo-check')
      .should('exist')
      .within(() => {
        cy.get('input[type="radio"][value="true"]').should('exist').and('not.be.disabled').check({ force: true });
      });

    // Verify that "Ja" is selected
    cy.get('#moped-extrainfo-check').find('input[type="radio"][value="true"]').should('be.checked');

    // Verify the label text
    cy.get('#moped-extrainfo-check').find('input[type="radio"][value="true"]').next('label').should('contain', 'Ja');

    // The expression for the extra input field should then take effect and we should see the input field
    cy.get('#moped-extrainfo-data').should('exist');
    cy.get('#moped-extrainfo-data').type(extrainfo);

    cy.get('#custom-button-subform-moped-exitButton').click();

    // Verify subform is added to the main form table
    cy.get('#subform-subform-mopeder-table tbody tr').should('have.length', 1);
    cy.get('#subform-subform-mopeder-table tbody tr').within(() => {
      cy.get('td').eq(0).should('have.text', regno);
      cy.get('td').eq(1).should('have.text', merke);
      cy.get('td').eq(2).should('have.text', extrainfo);
    });

    // Test that a new subform doesn't populate with previous data
    cy.get('#subform-subform-mopeder-add-button').click();
    cy.get('#moped-regno').should('have.value', '');
    cy.get('#moped-merke').should('have.value', '');
    cy.get('#moped-modell').should('have.value', '');
    cy.get('#moped-produksjonsaar').should('have.value', '');
    cy.get('#custom-button-subform-moped-cancelButton').click();

    // Test main form data persistence after subform submit
    cy.get('#Input-Name').should('have.value', name);

    // Add subforms until limit is reached (maxcount is 3)
    cy.get('#subform-subform-mopeder-add-button').click();
    cy.get('#custom-button-subform-moped-cancelButton').click();

    // Adding another subform should not be possible
    cy.get('#subform-subform-mopeder-add-button').click();
    cy.get('.Toastify__toast--error', { timeout: 10000 }).then(($toast) => {
      cy.wrap($toast).should('contain', 'Maks antall moped oppføringer har blitt nådd');
      cy.wrap($toast).should('have.class', 'Toastify__toast--error');
    });
  });

  it('subform validation', () => {
    cy.findByRole('textbox', { name: /navn/i }).type('Per');
    cy.findByRole('textbox', { name: /alder/i }).type('28');

    // Test minimum number of subforms
    cy.get(appFrontend.errorReport).should('not.exist');
    cy.findByRole('button', { name: /neste/i }).click();
    cy.get(appFrontend.errorReport).should('be.visible');
    cy.get(appFrontend.fieldValidation('subform-mopeder')).should('contain.text', 'Minst 1 moped oppføring er påkrevd');

    // Test that save is blocked by validation
    cy.findByRole('button', { name: /legg til moped/i }).click();
    cy.findByRole('button', { name: /ferdig/i }).should('be.visible');
    cy.get(appFrontend.errorReport).should('not.exist');
    cy.findByRole('button', { name: /ferdig/i }).click();
    cy.get(appFrontend.errorReport).should('be.visible');

    // Test validation of subform content
    cy.findByRole('button', { name: /avbryt/i }).click();
    cy.findByRole('button', { name: /neste/i }).click();
    cy.get(appFrontend.errorReport).should('be.visible');
    cy.get(appFrontend.fieldValidation('subform-mopeder')).should(
      'not.contain.text',
      'Minst 1 moped oppføring er påkrevd',
    );
    cy.get(appFrontend.fieldValidation('subform-mopeder')).should(
      'contain.text',
      'Det er feil i en eller flere moped oppføringer',
    );

    // Test that editing a subform with visible validations shows validations upon entering
    cy.findByRole('button', { name: /endre/i }).click();
    cy.findByRole('button', { name: /ferdig/i }).should('be.visible');
    cy.get(appFrontend.errorReport).should('be.visible');

    // Test that main form still shows the same validations as before upon exiting subform
    cy.findByRole('button', { name: /avbryt/i }).click();
    cy.findByRole('button', { name: /neste/i }).should('be.visible');
    cy.get(appFrontend.errorReport).should('be.visible');
    cy.get(appFrontend.fieldValidation('subform-mopeder')).should(
      'contain.text',
      'Det er feil i en eller flere moped oppføringer',
    );

    // Test that main form still shows the same validations as before upon exiting a newly created subform
    // The reason for this case is that this did not work initially
    cy.findByRole('button', { name: /legg til moped/i }).click();
    cy.findByRole('button', { name: /ferdig/i }).should('be.visible');
    cy.get(appFrontend.errorReport).should('not.exist');
    cy.findByRole('button', { name: /avbryt/i }).click();
    cy.findByRole('button', { name: /neste/i }).should('be.visible');
    cy.get(appFrontend.errorReport).should('be.visible');
    cy.get(appFrontend.fieldValidation('subform-mopeder')).should(
      'contain.text',
      'Det er feil i en eller flere moped oppføringer',
    );
    cy.findAllByRole('button', { name: /slett/i }).last().clickAndGone();

    // Test that fixing the validations works
    cy.findByRole('button', { name: /endre/i }).click();
    cy.findByRole('button', { name: /ferdig/i }).should('be.visible');
    cy.get(appFrontend.errorReport).should('be.visible');
    cy.findByRole('textbox', { name: /registreringsnummer/i }).type('ABC123');
    cy.findByRole('textbox', { name: /merke/i }).type('Digdir');
    cy.findByRole('textbox', { name: /modell/i }).type('Scooter2000');
    cy.findByRole('textbox', { name: /produksjonsår/i }).type('2024');
    cy.get(appFrontend.errorReport).should('not.exist');
    cy.findByRole('button', { name: /ferdig/i }).click();
    cy.findByRole('button', { name: /neste/i }).should('be.visible');
    cy.get(appFrontend.errorReport).should('not.exist');
  });

  it('PDF should include subforms', () => {
    cy.findByRole('textbox', { name: /navn/i }).type('Per');
    cy.findByRole('textbox', { name: /alder/i }).type('28');

    cy.findByRole('button', { name: /legg til moped/i }).click();
    cy.findByRole('textbox', { name: /registreringsnummer/i }).type('ABC123');
    cy.findByRole('textbox', { name: /merke/i }).type('Digdir');
    cy.findByRole('textbox', { name: /modell/i }).type('Scooter2000');
    cy.findByRole('textbox', { name: /produksjonsår/i }).type('2024');
    cy.findByRole('button', { name: /ferdig/i }).click();

    cy.findByRole('button', { name: /legg til moped/i }).click();
    cy.findByRole('textbox', { name: /registreringsnummer/i }).type('XYZ987');
    cy.findByRole('textbox', { name: /merke/i }).type('Altinn');
    cy.findByRole('textbox', { name: /modell/i }).type('3.0');
    cy.findByRole('textbox', { name: /produksjonsår/i }).type('2030');
    cy.findByRole('button', { name: /ferdig/i }).click();

    cy.testPdf({
      snapshotName: 'subform',
      enableResponseFuzzing: true,
      callback: () => {
        cy.getSummary('Navn').should('contain.text', 'Per');
        cy.getSummary('Alder').should('contain.text', '28 år');

        cy.getSummary('Registreringsnummer').eq(0).should('contain.text', 'ABC123');
        cy.getSummary('Merke').eq(0).should('contain.text', 'Digdir');
        cy.getSummary('Modell').eq(0).should('contain.text', 'Scooter2000');
        cy.getSummary('Produksjonsår').eq(0).should('contain.text', '2024');

        cy.getSummary('Registreringsnummer').eq(1).should('contain.text', 'XYZ987');
        cy.getSummary('Merke').eq(1).should('contain.text', 'Altinn');
        cy.getSummary('Modell').eq(1).should('contain.text', '3.0');
        cy.getSummary('Produksjonsår').eq(1).should('contain.text', '2030');
      },
    });
  });
});
