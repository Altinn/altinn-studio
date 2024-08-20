describe('Number component', () => {
  it('should render correctly', () => {
    cy.goto('changename');

    cy.findByRole('checkbox', { name: /cards/i }).check();
    cy.gotoNavPage('cards');
    const numberCard = '[data-componentid="number-Card"]';

    cy.get(numberCard)
      .findByText(/total gjeld/i)
      .should('exist');
    cy.get(numberCard)
      .findByLabelText(/total gjeld/i)
      .should('contain.text', '0 kr');

    cy.get(numberCard)
      .findByText(/Statisk verdi som tall/i)
      .should('exist');
    cy.get(numberCard)
      .findByLabelText(/Statisk verdi som tall/i)
      .should('contain.text', '2 000 kr');

    cy.get(numberCard)
      .findByText(/Kredittkort prosent/i)
      .should('exist');
    cy.get(numberCard)
      .findByLabelText(/Kredittkort prosent/i)
      .should('contain.text', '0 %');

    cy.get(numberCard)
      .findAllByText(/Statisk verdi med desimal/i)
      .should('exist');
    cy.get(numberCard)
      .findByLabelText(/statisk verdi med desimal/i)
      .should('contain.text', '20 000,2 kr');
  });
});
