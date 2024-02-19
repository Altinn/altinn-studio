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

  it('Should scroll to top whenever navigating to a new page', () => {
    cy.goto('group');

    cy.findByText(/Aktiver preutfylling/).should('exist');

    cy.scrollTo(0, 1000);

    cy.findByRole('button', { name: /Neste/ }).click();

    cy.window().its('scrollY').should('equal', 0);
  });

  it('Should focus main-content whenever navigating to a new page', () => {
    cy.goto('group');

    cy.findByText(/Aktiver preutfylling/).should('exist');

    cy.findByRole('button', { name: /Neste/ }).click();

    cy.get('#main-content').should('be.focused');
  });
});
