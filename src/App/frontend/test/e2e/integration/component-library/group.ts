import { AppFrontend } from 'test/e2e/pageobjects/app-frontend';

const appFrontend = new AppFrontend();

describe('Group summary test', () => {
  beforeEach(() => {
    cy.startAppInstance(appFrontend.apps.componentLibrary, { authenticationLevel: '2' });
    cy.gotoNavPage('Gruppe');
  });

  it('Fills in an input in the base level group, the text appears in summary', () => {
    const groupInputValue = 'Test input for group';

    cy.get(`input[id="GroupPage-Input"]`).type(groupInputValue);

    cy.get('div[data-testid="summary-group-component"]')
      .first()
      .within(() => {
        cy.contains('span', groupInputValue).should('exist');
      });
  });

  it('Fills in an input in the nested group, the text appears in summary', () => {
    const nestedGroupInputValue = 'Test input inside nested group';

    cy.get(`input[id="GroupPage-Nested-Input"]`).type(nestedGroupInputValue);

    cy.get('section[data-testid="summary-group-component-1"]').within(() => {
      cy.contains('span', nestedGroupInputValue).should('exist');
    });
  });

  it('Fills in a textarea in the nested group, the text appears in summary', () => {
    const longTextValue = 'This is a long text example.';
    cy.get(`textarea[id="GroupPage-Nested-Textarea"]`).type(longTextValue);

    cy.get('section[data-testid="summary-group-component-1"]').within(() => {
      cy.contains('span', longTextValue).should('exist');
    });
  });

  it('Clicks checkboxes, selected boxes appears in summary in nested group', () => {
    cy.get('input[id="GroupPage-Nested-Checkboxes-Kjøre-til-hytta-på-fjellet"]').check();
    cy.get('input[id="GroupPage-Nested-Checkboxes-Kjøring-i-skogen"]').check();
    cy.get('input[id="GroupPage-Nested-Checkboxes-Korte-strekninger-med-bykjøring,-eller-annen-moro"]').check();
    cy.get('input[id="GroupPage-Nested-Checkboxes-Lange-strekninger-på-større-veier-i-Norge"]').check();

    cy.get('section[data-testid="summary-group-component-1"]')
      .first()
      .within(() => {
        cy.contains('li', 'Kjøre til hytta på fjellet').should('exist');
        cy.contains('li', 'Kjøring i skogen').should('exist');
        cy.contains('li', 'Korte strekninger med bykjøring, eller annen moro').should('exist');
        cy.contains('li', 'Lange strekninger på større veier i Norge').should('exist');
      });
  });

  it('Clicks radiobutton, selected option appears in summary', () => {
    cy.get('input[type="radio"][value="bil"]').click();
    cy.get('section[data-testid="summary-group-component-2"]')
      .first()
      .within(() => {
        cy.contains('span', 'Bil').should('exist');
        cy.contains('span', 'Moped').should('not.exist');
        cy.contains('span', 'Traktor').should('not.exist');
        cy.contains('span', 'Båt').should('not.exist');
      });
  });

  it('Hides nested group headings when their source group is hidden', () => {
    cy.get('#GroupPage-Nested-Input').type('A value in the nested group');
    cy.get('[data-testid="summary-group-component-1"]').should('be.visible');
    cy.get('#GroupPage-Input').type('Hide nested groups');
    cy.waitUntilSaved();
    cy.get('[data-summary-target="GroupPage-Group"]').should('contain.text', 'Hide nested groups');
    cy.get('[data-testid="summary-group-component-1"]', { timeout: 0 }).should('not.exist');
    cy.get('[data-testid="summary-group-component-2"]', { timeout: 0 }).should('not.exist');
  });

  it('Hides empty nested group headings without hiding a populated parent', () => {
    cy.get('#GroupPage-Input').type('Keep the parent visible');
    cy.waitUntilSaved();
    cy.get('[data-summary-target="GroupPage-Group"]').should('contain.text', 'Keep the parent visible');
    cy.get('[data-testid="summary-group-component-2"]').should('not.be.visible');
    cy.get('#GroupPage-Nested-Nested-Input').type('Show the nested group');
    cy.get('[data-testid="summary-group-component-2"]').should('be.visible');
  });
});
