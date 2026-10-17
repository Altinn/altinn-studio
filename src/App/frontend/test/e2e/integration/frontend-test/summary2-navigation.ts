import { AppFrontend } from 'test/e2e/pageobjects/app-frontend';

const appFrontend = new AppFrontend();

describe('Summary2 navigation', () => {
  it('uses overrides to show Next after editing and validates forward navigation', () => {
    cy.interceptLayout('Task_2', undefined, (layouts) => {
      layouts.summary!.data.layout = [
        {
          id: 'summary2-name',
          type: 'Summary2',
          target: { type: 'page', id: 'form' },
          overrides: [
            { componentType: 'Input', showNextButton: true },
            { componentId: 'newFirstName', showNextButton: false },
          ],
        },
        ...layouts.summary!.data.layout.filter(
          (component) => component.type === 'NavigationButtons' || component.type === 'NavigationBar',
        ),
      ];
    });
    cy.goto('changename');
    cy.get(appFrontend.changeOfName.newFirstName).type('Anne');
    cy.findByRole('tab', { name: /nytt etternavn/i }).click();
    cy.get(appFrontend.changeOfName.newLastName).type('Ola');
    cy.get(appFrontend.changeOfName.dateOfEffect).type('01/01/2026');
    cy.findByRole('checkbox', { name: /ja, jeg bekrefter/i }).check();
    cy.findByRole('radio', { name: /adoptivforelders/i }).check();
    cy.gotoNavPage('summary');

    cy.get('[data-summary-target="newMiddleName"]').findByRole('button', { name: 'Endre' }).click();
    cy.get(appFrontend.changeOfName.newMiddleName).should('be.focused');
    cy.findByRole('button', { name: 'Neste' }).should('be.visible');
    cy.findByRole('button', { name: 'Tilbake til oppsummering' }).click();

    cy.get('[data-summary-target="newFirstName"]').findByRole('button', { name: 'Endre' }).click();
    cy.get(appFrontend.changeOfName.newFirstName).should('be.focused');
    cy.findByRole('button', { name: 'Tilbake til oppsummering' }).should('be.visible');
    cy.findByRole('button', { name: 'Neste', timeout: 0 }).should('not.exist');
    cy.findByRole('button', { name: 'Tilbake til oppsummering' }).click();

    cy.get('[data-summary-target="newMiddleName"]').findByRole('button', { name: 'Endre' }).click();
    cy.get(appFrontend.changeOfName.newFirstName).clear();
    cy.findByRole('button', { name: 'Neste' }).click();
    cy.get(appFrontend.errorReport).should('be.visible');
    cy.navPage('form').should('have.attr', 'aria-current', 'page');
    cy.findByRole('button', { name: 'Tilbake til oppsummering' }).click();
    cy.navPage('summary').should('have.attr', 'aria-current', 'page');

    cy.get('[data-summary-target="newMiddleName"]').findByRole('button', { name: 'Endre' }).click();
    cy.get(appFrontend.changeOfName.newFirstName).type('Anne');
    cy.findByRole('button', { name: 'Neste' }).click();
    cy.navPage('summary').should('have.attr', 'aria-current', 'page');
    cy.findByRole('button', { name: 'Tilbake til oppsummering', timeout: 0 }).should('not.exist');
  });

  it('hides Next when an override targets a field on the last page', () => {
    cy.interceptLayout('Task_2', undefined, (layouts) => {
      layouts.summary!.data.layout = [
        {
          id: 'summary2-last-page',
          type: 'Summary2',
          target: { type: 'component', id: 'gjeld' },
          overrides: [{ componentId: 'gjeld', showNextButton: true }],
        },
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

    cy.get('[data-summary-target="gjeld"]').findByRole('button', { name: 'Endre' }).click();
    cy.get('#gjeld').should('be.focused');
    cy.navPage('grid').should('have.attr', 'aria-current', 'page');
    cy.findByRole('button', { name: 'Tilbake til oppsummering' }).should('be.visible');
    cy.findByRole('button', { name: 'Neste', timeout: 0 }).should('not.exist');
    cy.findByRole('button', { name: 'Tilbake til oppsummering' }).click();
    cy.navPage('summary').should('have.attr', 'aria-current', 'page');
  });

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
