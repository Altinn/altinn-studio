import { AppFrontend } from 'test/e2e/pageobjects/app-frontend';

const appFrontend = new AppFrontend();

describe('Summary2 navigation', () => {
  it('returns to Summary2 after editing and restores normal navigation when that page becomes hidden', () => {
    cy.interceptLayout('Task_2', undefined, (layouts) => {
      layouts.summary!.data.hidden = ['equals', ['component', 'newFirstName'], 'Hide'];
      layouts.summary!.data.layout = [
        { id: 'summary2-name', type: 'Summary2', target: { type: 'component', id: 'newFirstName' } },
        ...layouts.summary!.data.layout.filter(
          (component) => component.type === 'NavigationButtons' || component.type === 'NavigationBar',
        ),
      ];
    });
    cy.goto('changename');
    cy.get(appFrontend.changeOfName.newFirstName).type('Anne');
    cy.findByRole('checkbox', { name: /ja, jeg bekrefter/i }).check();
    cy.findByRole('radio', { name: /adoptivforelders/i }).check();
    cy.gotoNavPage('summary');
    cy.get('[data-summary-target="newFirstName"]').findByRole('button', { name: 'Endre' }).click();
    cy.get(appFrontend.changeOfName.newFirstName).should('be.focused');
    cy.findByRole('button', { name: 'Tilbake til oppsummering' }).click();
    cy.navPage('summary').should('have.attr', 'aria-current', 'page');
    cy.get('[data-summary-target="newFirstName"]').findByRole('button', { name: 'Endre' }).click();
    cy.get(appFrontend.changeOfName.newFirstName).clear();
    cy.get(appFrontend.changeOfName.newFirstName).type('Hide');
    cy.waitUntilSaved();
    cy.findByRole('button', { name: 'Neste' }).should('be.visible');
    cy.findByRole('button', { name: 'Tilbake til oppsummering', timeout: 0 }).should('not.exist');
  });
});
