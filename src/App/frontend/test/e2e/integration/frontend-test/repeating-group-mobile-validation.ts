import { AppFrontend } from 'test/e2e/pageobjects/app-frontend';

const appFrontend = new AppFrontend();
const indicator = '[data-testid="row-validation-indicator"]';
const row = (variant: string, index: number) => `#group-validation-${variant}-table-body > tr[data-row-num="${index}"]`;
const dialog = () => cy.findByRole('dialog', { name: 'Meldinger' });

function setup(width: number) {
  cy.viewport(width, 844);
  cy.goto('group');
  cy.get(appFrontend.navMobileMenu).click();
  cy.get(appFrontend.navMenu)
    .findByRole('button', { name: /^5\. Validering i grupper$/ })
    .click();
  cy.location('pathname').should('include', '/validation-showcase');
  cy.findByRole('button', { name: 'Last eksempeldata' }).should('be.visible');
  cy.findByRole('button', { name: 'Last eksempeldata' }).click();
  cy.get('#group-validation-default-table-body > tr[data-row-num]').should('have.length', 7);
  cy.waitUntilSaved();
  cy.findByRole('button', { name: /Neste/ }).click();
  cy.get(appFrontend.errorReport).should('be.visible');
}

function openRow(variant: string, index: number) {
  cy.get(row(variant, index)).find(indicator).click({ scrollBehavior: 'center' });
  dialog().should('be.visible').and('have.css', 'opacity', '1');
}

function assertWithinViewport(width: number) {
  cy.document().should((document) => {
    expect(document.documentElement.scrollWidth).to.be.at.most(width);
  });
}

describe('Repeating-group validation on mobile', () => {
  for (const width of [390, 320]) {
    it(`keeps full-width fields, visible messages and navigable editors at ${width}px`, () => {
      setup(width);
      assertWithinViewport(width);
      cy.injectAxe();
      cy.checkA11y();
      cy.get('#validation-table-name-4').should(($input) => {
        expect($input[0].getBoundingClientRect().width).to.be.at.least(width - 72);
      });
      cy.get('#group-validation-table').find('[data-testid="table-row-validation-messages"]').should('not.exist');
      cy.get(row('table', 4)).should('contain.text', 'Oppgi navnet slik det står i registeret.');
      cy.get(row('table', 4)).should('contain.text', 'Alderen er høyere enn ved forrige innrapportering.');
      cy.get(row('table', 6)).should('contain.text', 'Navnet mangler i registeret.');
      cy.get(row('table', 6)).should('contain.text', 'Kontroller at navnet er skrevet riktig.');
      cy.get(row('table', 5)).find(indicator).should('not.exist');
      cy.get('#validation-table-age-4').should('have.attr', 'aria-describedby').and('include', 'validations');
      cy.get(row('table', 4))
        .find('button')
        .each(($button) => {
          const bounds = $button[0].getBoundingClientRect();
          expect(bounds.width).to.be.at.least(44);
          expect(bounds.height).to.be.at.least(44);
        });

      openRow('default', 4);
      dialog().findByRole('heading').should('not.exist');
      dialog().should(($dialog) => {
        const bounds = $dialog[0].getBoundingClientRect();
        expect(bounds.left).to.be.at.least(0);
        expect(bounds.right).to.be.at.most(width);
      });
      dialog().find('button[data-target-node="validation-default-age-4"]').click();
      cy.get('#validation-default-age-4').should('have.focus');
      cy.get('#validation-default-name-4').should('be.visible');
      cy.get('#group-validation-default').should('contain.text', 'Oppgi navnet slik det står i registeret.');

      openRow('mixed', 4);
      dialog().find('button[data-target-node="validation-mixed-age-4"]').click();
      cy.get('#validation-mixed-age-4').should('have.focus');
      cy.get('#validation-mixed-name-4').should('be.visible');
      cy.get(row('mixed', 4)).find('#validation-mixed-name-4').should('exist');
      cy.get('#group-validation-mixed')
        .find(appFrontend.group.editContainer)
        .find('#validation-mixed-name-4')
        .should('not.exist');
      openRow('mixed', 4);
      dialog().find('button[data-target-node="validation-mixed-name-4"]').click();
      cy.get('#validation-mixed-name-4').should('have.focus');
      cy.get('#validation-mixed-age-4').should('be.visible');

      openRow('table', 1);
      cy.tab();
      cy.tab();
      cy.focused().should('have.attr', 'data-target-node', 'validation-table-species-1');
      for (const type of ['keyDown', 'keyUp']) {
        cy.then(() =>
          Cypress.automation('remote:debugger:protocol', {
            command: 'Input.dispatchKeyEvent',
            params: {
              type,
              key: 'Enter',
              code: 'Enter',
              windowsVirtualKeyCode: 13,
              ...(type === 'keyDown' ? { text: '\r', unmodifiedText: '\r' } : {}),
            },
          }),
        );
      }
      cy.get('#validation-table-species-1').should('have.focus');
      cy.get(appFrontend.errorReport)
        .findAllByRole('button', { name: 'Navnet stemmer ikke med opplysningene i registeret.' })
        .first()
        .click();
      cy.get('#validation-default-name-0').should('have.focus');
      assertWithinViewport(width);
      cy.testWcag();
    });
  }

  it('keeps the popup and its close control inside a short landscape viewport', () => {
    setup(390);
    cy.viewport(740, 390);
    openRow('table', 4);
    dialog().should(($dialog) => {
      const bounds = $dialog[0].getBoundingClientRect();
      expect(bounds.top).to.be.at.least(0);
      expect(bounds.bottom).to.be.at.most(390);
    });
    dialog().findByRole('button', { name: 'Lukk' }).should('be.visible');
    dialog().find('button[data-target-node="validation-table-age-4"]').scrollIntoView().click();
    cy.get('#validation-table-age-4').should('have.focus');
  });

  it('retains row-container and whole-group validation messages at mobile widths', () => {
    setup(390);
    cy.findByRole('checkbox', { name: 'På feltene' }).uncheck();
    cy.findByRole('checkbox', { name: 'På raden samlet' }).check();
    cy.waitUntilSaved();
    cy.findByRole('button', { name: /Neste/ }).click();
    cy.get(appFrontend.errorReport).should('contain.text', 'Denne meldingen gjelder opplysningene');
    cy.get('[data-testid="NavigationButtons"]').find('button').should('not.be.disabled');
    openRow('table', 0);
    dialog().should('contain.text', 'Denne meldingen gjelder opplysningene om kjæledyret samlet.');
    dialog().findByRole('button', { name: 'Lukk' }).click();
    cy.get(row('table', 0)).find(indicator).should('have.focus');
    cy.findByRole('checkbox', { name: 'På raden samlet' }).uncheck();
    cy.findByRole('checkbox', { name: 'På hele gruppen' }).check();
    cy.waitUntilSaved();
    cy.findByRole('button', { name: /Neste/ }).click();
    cy.get('#group-validation-table').find(indicator).should('not.exist');
    cy.get(appFrontend.errorReport).should('contain.text', 'Kontroller kjæledyrene i denne gruppen samlet.');
    assertWithinViewport(390);
  });
});
