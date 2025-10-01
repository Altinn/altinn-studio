describe('Cards component', () => {
  it('should render correctly', () => {
    cy.gotoHiddenPage('cards');

    cy.findByRole('checkbox', { name: /smake på kaker/i }).check();

    cy.visualTesting('cards');
  });
});
