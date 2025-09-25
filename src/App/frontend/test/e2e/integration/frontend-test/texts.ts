describe('Texts', () => {
  beforeEach(() => {
    cy.goto('changename');
  });

  it('Variable in texts work and are updated if the variable is updated with a calculation backend', () => {
    cy.findByRole('textbox', { name: /nytt mellomnavn/i }).type('Steffen');
    cy.findByRole('textbox', { name: /nytt mellomnavn/i }).should('have.value', 'Steffen');

    // We update newLastName which triggers a calculation backend that updates NewMiddleName
    cy.findByRole('textbox', { name: /nytt fornavn/i }).type('TriggerCalculation');
    cy.findByRole('textbox', { name: /nytt mellomnavn/i }).should('have.value', 'MiddleNameFromCalculation');
  });
});
