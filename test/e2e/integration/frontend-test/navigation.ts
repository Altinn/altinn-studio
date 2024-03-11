import type { IApplicationMetadata } from 'src/features/applicationMetadata';

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

  it('should focus main-content whenever navigating to a new task', () => {
    cy.goto('message');

    cy.findByText('Appen for test av app frontend').should('exist');

    cy.findByRole('button', { name: /Send inn/ }).click();

    cy.get('#main-content').should('be.focused');
  });

  it('should not focus main-content when loading the page in the browser', () => {
    cy.goto('message');

    cy.findByText('Appen for test av app frontend').should('exist');

    cy.reload();

    cy.findByText('Appen for test av app frontend').should('exist');

    cy.get('#main-content').should('not.be.focused');
  });

  it('should not focus main-content when loading the page in the browser and there is no instance selector', () => {
    cy.intercept('**/applicationmetadata', (req) => {
      req.on('response', (res) => {
        const body = res.body as IApplicationMetadata;
        body.onEntry = undefined;
        res.send(body);
      });
    });
    cy.goto('message');
    cy.findByText('Appen for test av app frontend').should('exist');
    cy.get('#main-content').should('not.be.focused');
  });
});
