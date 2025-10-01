import { AppFrontend } from 'test/e2e/pageobjects/app-frontend';

const appFrontend = new AppFrontend();

describe('Subform tableEditButton expressions', () => {
  beforeEach(() => {
    cy.startAppInstance(appFrontend.apps.subformTest, { authenticationLevel: '1' });
  });

  it('should evaluate tableEditButton expressions per row', () => {
    cy.findByRole('textbox', { name: /navn/i }).type('Per');
    cy.findByRole('textbox', { name: /alder/i }).type('28');

    // Add first moped with Vespa brand - should show "Rediger Vespa"
    cy.findByRole('button', { name: /legg til moped/i }).clickAndGone();
    cy.findByRole('textbox', { name: /registreringsnummer/i }).type('ABC123');
    cy.findByRole('textbox', { name: /merke/i }).type('Vespa');
    cy.findByRole('textbox', { name: /modell/i }).type('Primavera');
    cy.findByRole('textbox', { name: /produksjonsår/i }).type('2020');
    cy.findByRole('button', { name: /ferdig/i }).clickAndGone();

    // Add second moped with Honda brand - should show "Endre"
    cy.findByRole('button', { name: /legg til moped/i }).clickAndGone();
    cy.findByRole('textbox', { name: /registreringsnummer/i }).type('XYZ987');
    cy.findByRole('textbox', { name: /merke/i }).type('Honda');
    cy.findByRole('textbox', { name: /modell/i }).type('Ruckus');
    cy.findByRole('textbox', { name: /produksjonsår/i }).type('2021');
    cy.findByRole('button', { name: /ferdig/i }).clickAndGone();

    // Verify that the table shows correct edit button text based on expressions
    cy.get('#subform-subform-mopeder-table tbody tr').should('have.length', 2);

    // First row (Vespa) should have "Rediger Vespa" button
    cy.get('#subform-subform-mopeder-table tbody tr')
      .eq(0)
      .within(() => {
        cy.get('td').eq(0).should('contain.text', 'ABC123');
        cy.get('td').eq(1).should('contain.text', 'Vespa');
        cy.findByRole('button', { name: 'Rediger Vespa' }).should('exist');
      });

    // Second row (Honda) should have "Endre" button
    cy.get('#subform-subform-mopeder-table tbody tr')
      .eq(1)
      .within(() => {
        cy.get('td').eq(0).should('contain.text', 'XYZ987');
        cy.get('td').eq(1).should('contain.text', 'Honda');
        cy.findByRole('button', { name: 'Endre' }).should('exist');
      });

    // Test that clicking the expression-based button works correctly
    cy.get('#subform-subform-mopeder-table tbody tr')
      .eq(0)
      .within(() => {
        cy.findByRole('button', { name: 'Rediger Vespa' }).click();
      });

    // Should navigate to subform edit page
    cy.url().should('include', '/subform-mopeder/');
    cy.findByRole('textbox', { name: /registreringsnummer/i }).should('have.value', 'ABC123');
    cy.findByRole('textbox', { name: /merke/i }).should('have.value', 'Vespa');

    // Go back to main form
    cy.findByRole('button', { name: /avbryt/i }).clickAndGone();

    // Test clicking the other button
    cy.get('#subform-subform-mopeder-table tbody tr')
      .eq(1)
      .within(() => {
        cy.findByRole('button', { name: 'Endre' }).click();
      });

    // Should navigate to subform edit page for Honda
    cy.url().should('include', '/subform-mopeder/');
    cy.findByRole('textbox', { name: /registreringsnummer/i }).should('have.value', 'XYZ987');
    cy.findByRole('textbox', { name: /merke/i }).should('have.value', 'Honda');

    // Go back to main form
    cy.findByRole('button', { name: /avbryt/i }).clickAndGone();
  });

  it('should update edit button text when subform data changes', () => {
    cy.findByRole('textbox', { name: /navn/i }).type('Test User');
    cy.findByRole('textbox', { name: /alder/i }).type('25');

    // Add a moped with non-Vespa brand
    cy.findByRole('button', { name: /legg til moped/i }).clickAndGone();
    cy.findByRole('textbox', { name: /registreringsnummer/i }).type('TEST123');
    cy.findByRole('textbox', { name: /merke/i }).type('Yamaha');
    cy.findByRole('textbox', { name: /modell/i }).type('Vino');
    cy.findByRole('textbox', { name: /produksjonsår/i }).type('2019');
    cy.findByRole('button', { name: /ferdig/i }).clickAndGone();

    // Initially should show "Endre"
    cy.get('#subform-subform-mopeder-table tbody tr')
      .eq(0)
      .within(() => {
        cy.findByRole('button', { name: 'Endre' }).should('exist');
      });

    // Edit the moped to change brand to Vespa
    cy.get('#subform-subform-mopeder-table tbody tr')
      .eq(0)
      .within(() => {
        cy.findByRole('button', { name: 'Endre' }).click();
      });

    // Change brand to Vespa
    cy.findByRole('textbox', { name: /merke/i }).clear();

    cy.findByRole('textbox', { name: /merke/i }).type('Vespa');

    cy.findByRole('button', { name: /ferdig/i }).clickAndGone();

    // Button text should now be "Rediger Vespa"
    cy.get('#subform-subform-mopeder-table tbody tr')
      .eq(0)
      .within(() => {
        cy.get('td').eq(1).should('contain.text', 'Vespa');
        cy.findByRole('button', { name: 'Rediger Vespa' }).should('exist');
        cy.findByRole('button', { name: 'Endre' }).should('not.exist');
      });
  });
});
