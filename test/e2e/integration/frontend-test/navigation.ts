describe('Navigation', () => {
  it('Should redirect to the current task and the first page of that task when navigating directly to the instance', () => {
    cy.goto('changename');

    cy.url().should('satisfy', (url) => url.endsWith('/Task_2/form'));
    cy.findByLabelText(/Nytt fornavn/).should('exist');

    cy.url().then((url) => {
      cy.visit(url.replace('/Task_2/form', ''));
    });

    cy.url().should('satisfy', (url) => url.endsWith('/Task_2/form'));
    cy.findByLabelText(/Nytt fornavn/).should('exist');
  });
});
