export const fillInInputAndVerify = (text: string) => {
  cy.gotoNavPage('Kort svar');
  cy.get('#InputPage-Input').type(text);
  cy.get('[data-testid="summary-single-value-component"]').eq(0).find('span.ds-paragraph').should('have.text', text);
};
