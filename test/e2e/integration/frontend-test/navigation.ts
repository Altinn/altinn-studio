import type { IncomingApplicationMetadata } from 'src/features/applicationMetadata/types';

describe('Navigation', () => {
  it('Should redirect to the current task and the first page of that task when navigating directly to the instance', () => {
    cy.intercept('PATCH', '**/data/**').as('saveFormData');
    cy.goto('changename');

    cy.findByRole('textbox', { name: /nytt fornavn/i }).should('exist');
    cy.url().should('satisfy', (url: string) => url.endsWith('/Task_2/form'));

    // When the form loads, some values are set automatically. We need to wait for this saving to be done before
    // we try to navigate, otherwise this will fail hard.
    cy.wait('@saveFormData');
    cy.waitUntilSaved();

    cy.url().then((url) => {
      cy.visit(url.replace('/Task_2/form', ''));
    });

    cy.url().should('satisfy', (url: string) => url.endsWith('/Task_2/form'));
    cy.findByRole('textbox', { name: /nytt fornavn/i }).should('exist');
    cy.waitUntilSaved();
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
        const body = res.body as IncomingApplicationMetadata;
        body.onEntry = undefined;
        res.send(body);
      });
    });
    cy.goto('message');
    cy.findByText('Appen for test av app frontend').should('exist');
    cy.get('#main-content').should('not.be.focused');
  });

  it("should read the summary component's textResourceBindings.returnToSummaryButtonTitle and display this text as button title", () => {
    cy.interceptLayout(
      'group',
      (component) => component,
      (layout) => {
        layout['prefill'].data.layout.push({
          id: 'summary-group-test',
          type: 'Summary',
          componentRef: 'choose-group-prefills',
          textResourceBindings: {
            returnToSummaryButtonTitle: 'Updated text from Summary Component',
          },
        });

        return layout;
      },
    );
    cy.goto('group');

    cy.findByText(/Aktiver preutfylling/).should('exist');

    cy.findByRole('button', { name: /Endre/ }).click();
    cy.findByRole('button', { name: /Updated text from Summary Component/ }).should('exist');
  });

  it("should read the summary component's display.nextButton and display the next button as well as the back to summary button", () => {
    cy.interceptLayout(
      'group',
      (component) => component,
      (layout) => {
        layout['prefill'].data.layout.push({
          id: 'summary-group-test',
          type: 'Summary',
          componentRef: 'choose-group-prefills',
          display: {
            nextButton: true,
          },
        });

        return layout;
      },
    );
    cy.goto('group');

    cy.findByText(/Aktiver preutfylling/).should('exist');

    cy.findByRole('button', { name: /Endre/ }).click();

    cy.findByRole('button', { name: /Neste/ }).should('exist');
    cy.findByRole('button', { name: /Tilbake til oppsummering/ }).should('exist');
  });

  function mockLinkTo(type: 'component' | 'page', target: string) {
    cy.interceptLayout(
      'group',
      (component) => component,
      (layout) => {
        layout['prefill'].data.layout.push({
          id: 'paragraph-formLink-test',
          type: 'Paragraph',
          textResourceBindings: {
            title: [type === 'component' ? 'linkToComponent' : 'linkToPage', 'Klikk på meg', target],
          },
        });

        return layout;
      },
    );
    cy.goto('group');
  }

  it('should navigate to a specified page clicking a linkToPage', () => {
    mockLinkTo('page', 'repeating');
    cy.findByRole('link', { name: 'Klikk på meg' }).click();
    cy.url().should('satisfy', (url: string) => url.endsWith('/Task_3/repeating'));
  });

  it('should navigate to a specified page and focus component when clicking a linkToComponent', () => {
    mockLinkTo('component', 'hideRepeatingGroupRow');
    cy.findByRole('link', { name: 'Klikk på meg' }).click();
    cy.url().should('satisfy', (url: string) => url.endsWith('/Task_3/repeating'));
    cy.findByRole('textbox', { name: /hvilket tall må "endre fra" være større enn for å skjule rader\?/i }).should(
      'be.focused',
    );
  });

  it('should navigate back to previous page when using browser back after navigating to a component', () => {
    mockLinkTo('component', 'hideRepeatingGroupRow');
    cy.findByRole('link', { name: 'Klikk på meg' }).click();
    cy.url().should('satisfy', (url: string) => url.endsWith('/Task_3/repeating'));
    cy.findByRole('textbox', { name: /hvilket tall må "endre fra" være større enn for å skjule rader\?/i }).should(
      'be.focused',
    );
    cy.go('back');
    cy.url().should('satisfy', (url: string) => url.endsWith('/Task_3/prefill'));
  });

  it('Should render link as text and not link if it points to a non-existing component', () => {
    mockLinkTo('component', 'thisComponentIdDoesNotExist');

    cy.url().should('satisfy', (url: string) => url.endsWith('/Task_3/prefill'));

    cy.findByRole('link', { name: 'Klikk på meg' }).should('not.exist');
    cy.findByText('Klikk på meg').should('not.exist');
  });

  it('should navigate back to previous page when using browser back after trying to navigate to a page', () => {
    mockLinkTo('page', 'hide');

    cy.url().should('satisfy', (url: string) => url.endsWith('/Task_3/prefill'));

    cy.findByRole('link', { name: 'Klikk på meg' }).click();
    cy.url().should('satisfy', (url: string) => url.endsWith('/Task_3/hide'));

    cy.go('back');

    cy.url().should('satisfy', (url: string) => url.endsWith('/Task_3/prefill'));
  });
});
