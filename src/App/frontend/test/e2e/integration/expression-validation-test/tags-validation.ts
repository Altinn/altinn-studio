import { AppFrontend } from 'test/e2e/pageobjects/app-frontend';

const appFrontend = new AppFrontend();

describe('Attachment tags validation', () => {
  beforeEach(() => {
    cy.intercept('**/active', []).as('noActiveInstances');
    cy.startAppInstance(appFrontend.apps.expressionValidationTest);
  });

  it('should update validations when saving tags', () => {
    cy.gotoNavPage('CV');
    cy.findByRole('textbox', { name: /alder/i }).type('17');

    // Opt-in to attachment type validation
    cy.findByRole('radio', { name: /ja/i }).dsCheck();

    cy.get(appFrontend.errorReport).should('contain.text', "Du må laste opp 'Vitnemål'");
    cy.get(appFrontend.errorReport).should('contain.text', "Du må laste opp 'Søknad'");
    cy.get(appFrontend.errorReport).should('contain.text', "Du må laste opp 'Motivasjonsbrev'");

    cy.get(appFrontend.expressionValidationTest.cvUploader).selectFile('test/e2e/fixtures/test.pdf', { force: true });

    cy.contains('Ferdig lastet').should('be.visible');
    cy.dsSelect(appFrontend.expressionValidationTest.groupTag, 'Søknad');
    cy.findByRole('button', { name: /^lagre$/i }).click();

    // Verify "Søknad" validation is removed, but others remain
    cy.get(appFrontend.errorReport).should('not.contain.text', "Du må laste opp 'Søknad'");
    cy.get(appFrontend.errorReport).should('contain.text', "Du må laste opp 'Vitnemål'");
    cy.get(appFrontend.errorReport).should('contain.text', "Du må laste opp 'Motivasjonsbrev'");

    cy.findByRole('button', { name: /rediger/i }).click();
    cy.dsSelect(appFrontend.expressionValidationTest.groupTag, 'Vitnemål');
    cy.findByRole('button', { name: /^lagre$/i }).click();

    // Verify "Vitnemål" validation is removed and "Søknad" validation is back
    cy.get(appFrontend.errorReport).should('contain.text', "Du må laste opp 'Søknad'");
    cy.get(appFrontend.errorReport).should('not.contain.text', "Du må laste opp 'Vitnemål'");
    cy.get(appFrontend.errorReport).should('contain.text', "Du må laste opp 'Motivasjonsbrev'");

    // Upload second file and tag as "Søknad"
    cy.get(appFrontend.expressionValidationTest.cvUploader).selectFile('test/e2e/fixtures/test.pdf', { force: true });
    cy.contains('Ferdig lastet').should('be.visible');
    cy.get(appFrontend.errorReport).should('contain.text', "Du må laste opp 'Søknad'");
    cy.dsSelect(appFrontend.expressionValidationTest.groupTag, 'Søknad');
    cy.findAllByRole('button', { name: /^lagre$/i })
      .last()
      .click();

    // Verify "Søknad" validation is removed
    cy.get(appFrontend.errorReport).should('not.contain.text', "Du må laste opp 'Søknad'");
    cy.get(appFrontend.errorReport).should('not.contain.text', "Du må laste opp 'Vitnemål'");
    cy.get(appFrontend.errorReport).should('contain.text', "Du må laste opp 'Motivasjonsbrev'");

    // Upload third file and tag as "Motivasjonsbrev"
    cy.get(appFrontend.expressionValidationTest.cvUploader).selectFile('test/e2e/fixtures/test.pdf', { force: true });
    cy.contains('Ferdig lastet').should('be.visible');
    cy.dsSelect(appFrontend.expressionValidationTest.groupTag, 'Motivasjonsbrev');
    cy.findAllByRole('button', { name: /^lagre$/i })
      .last()
      .click();

    // Verify no errors are visible, and tags are visible in the table
    cy.get(appFrontend.errorReport).should('not.exist');
    cy.contains('td', 'Søknad').should('be.visible');
    cy.contains('td', 'Vitnemål').should('be.visible');
    cy.contains('td', 'Motivasjonsbrev').should('be.visible');

    // Fill in remaining required fields
    cy.findByRole('textbox', { name: /fornavn/i }).type('Per');
    cy.findByRole('textbox', { name: /etternavn/i }).type('Hansen');
    cy.dsSelect(appFrontend.expressionValidationTest.kjønn, 'Mann');
    cy.findByRole('textbox', { name: /e-post/i }).type('test@altinn.no');
    cy.findByRole('textbox', { name: /telefonnummer/i }).type('98765432');
    cy.dsSelect(appFrontend.expressionValidationTest.bosted, 'Oslo');

    cy.findByRole('button', { name: /neste/i }).click();
    cy.findByRole('button', { name: /send inn/i }).click();
    cy.get(appFrontend.receipt.container).should('be.visible');
  });
});
