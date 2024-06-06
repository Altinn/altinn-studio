describe('Cards component', () => {
  it('should render correctly', () => {
    cy.goto('changename');

    cy.findByRole('checkbox', { name: /cards/i }).check();
    cy.gotoNavPage('cards');

    cy.findByRole('checkbox', { name: /smake på kaker/i }).check();

    cy.snapshot('cards');
  });
});
