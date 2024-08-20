describe('Number and Text components', () => {
  it('should render correctly', () => {
    cy.goto('changename');

    cy.findByRole('checkbox', { name: /cards/i }).check();
    cy.gotoNavPage('cards');
    const numberCard = '[data-componentid="number-Card"]';

    cy.get(numberCard)
      .findByLabelText(/total gjeld/i)
      .should('contain.text', '0 kr');
    cy.get(numberCard)
      .findByLabelText(/Statisk verdi som tall/i)
      .should('contain.text', '2 000 kr');
    cy.get(numberCard)
      .findByLabelText(/Kredittkort prosent/i)
      .should('contain.text', '0 %');
    cy.get(numberCard)
      .findByLabelText(/statisk verdi med desimal/i)
      .should('contain.text', '20 000,2 kr');

    const textCard = '[data-componentid="text-Card"]';

    cy.get(textCard)
      .findByLabelText(/Fornavn/)
      .should('contain.text', '0');
    cy.get(textCard)
      .findByLabelText(/Etternavn/)
      .should('contain.text', 'Mitt etternavn');
    cy.get(textCard)
      .findByLabelText(/Adresse/)
      .should('contain.text', 'Min adresse');
    cy.get(textCard).findByLabelText(/Tekst/).should('contain.text', 'Test');
    cy.get(textCard).findByLabelText(/Språk/).should('contain.text', 'nb');
  });
});
