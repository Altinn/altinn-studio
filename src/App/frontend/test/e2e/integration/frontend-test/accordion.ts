describe('Accordion', () => {
  it('Displays the containing information when the Accordion title is clicked', () => {
    cy.goto('changename');

    const accordionContent = /in horas tendebat resumptis/i;

    cy.findByText(accordionContent).should('not.be.visible');
    cy.findByText(/mer informasjon vedrørende navneendring/i).click();
    cy.findByText(accordionContent).should('be.visible');
  });
});
