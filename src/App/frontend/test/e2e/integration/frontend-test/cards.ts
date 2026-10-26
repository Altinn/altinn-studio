describe('Cards component', () => {
  it('should render correctly', () => {
    cy.gotoHiddenPage('cards');

    cy.findByRole('checkbox', { name: /smake på kaker/i }).check();

    cy.get('[data-componentid="cards-group-summary"][data-summary-target="option-test1"]').within(() => {
      cy.contains('label', 'Dyr med hjelpetekst og beskrivelse').should('be.visible');
      cy.contains('span', 'Pelskledd og lojal mot mennesker').should('be.visible');
      cy.root().should('not.contain.text', 'Et dyr som bjeffer');
      cy.findByRole('button', { name: /Hunder er menneskets beste venn/ }).click();
      cy.get('[data-testid="helptext"]').should('be.visible').and('contain.text', 'Andre liker katter bedre.');
      cy.findByRole('button', { name: /Hunder er menneskets beste venn/ }).click();
    });
    cy.get('[data-componentid="cards-group-summary"][data-summary-target="option-test3"]').within(() => {
      cy.contains('span', 'Fisk').should('be.visible');
      cy.findByRole('button', { name: /Fisk er flotte kjæledyr/ }).should('be.visible');
      cy.findByRole('button', { name: 'Dette er en hjelpetekst' }).should('not.exist');
    });

    cy.visualTesting('cards');
  });
});
