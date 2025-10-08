describe('Number and Text components', () => {
  it('should render Number correctly', () => {
    cy.gotoHiddenPage('cards');
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
      .findAllByLabelText(/statisk verdi med desimal/i)
      .should('contain.text', '20 000,2 kr');
  });
  it('should render Date correctly', () => {
    cy.gotoHiddenPage('cards');
    const dateCard = '[data-componentid="date-Card"]';
    cy.get(dateCard).findAllByLabelText(/Dato/, { trim: true }).should('contain.text', '27.09.2022');
    cy.get(dateCard)
      .findAllByLabelText(/Dato med tid/)
      .should('contain.text', '27.09.2022 06:00:00');
    cy.get(dateCard)
      .findAllByLabelText(/Dato med annet format/)
      .should('contain.text', '27/09/2022');
    cy.get(dateCard)
      .findAllByLabelText(/Dato med tid på annet format/)
      .should('contain.text', '27/09/2022 06:00:00');
  });
  it('should render Text correctly', () => {
    cy.gotoHiddenPage('cards');
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
