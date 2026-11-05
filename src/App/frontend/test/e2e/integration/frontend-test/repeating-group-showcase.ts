import { AppFrontend } from 'test/e2e/pageobjects/app-frontend';

const appFrontend = new AppFrontend();
const variants = ['default', 'mixed', 'table'] as const;
const indicator = '[data-testid="row-validation-indicator"]';
const row = (variant: string, index = 0) => `#group-validation-${variant}-table-body > tr[data-row-num="${index}"]`;
const dialog = () => cy.findByRole('dialog', { name: 'Meldinger' });

function setup() {
  cy.viewport(1440, 1000);
  cy.goto('group');
  cy.gotoNavPage('Validering i grupper');
  cy.findByRole('button', { name: 'Last eksempeldata' }).click();
  cy.get('#group-validation-default-table-body > tr[data-row-num]').should('have.length', 2);
  cy.waitUntilSaved();
  cy.findByRole('button', { name: /Neste/ }).last().click();
  cy.get(appFrontend.errorReport).should('be.visible');
}

describe('Repeating group validation showcase', () => {
  it('shows backend field messages in default, mixed and table-only layouts', () => {
    setup();
    for (const variant of variants) {
      cy.get(row(variant)).find(indicator).should('have.attr', 'data-color', 'danger');
      cy.get(row(variant, 1)).find(indicator).should('have.attr', 'data-color', 'warning');
    }
    cy.get(appFrontend.errorReport)
      .should('contain.text', 'Standardvisning: navn: Verdien må korrigeres.')
      .and('contain.text', 'Blandet redigering: alder: Verdien må korrigeres.')
      .and('contain.text', 'Kun tabell: dyreslag: Verdien må korrigeres.');
    cy.injectAxe();
    cy.checkA11y();
    cy.screenshot('validation-showcase-fields', { capture: 'fullPage' });

    cy.get(row('default')).scrollIntoView({ offset: { top: -180, left: 0 } });
    cy.get(row('default')).find(indicator).click({ scrollBehavior: false });
    dialog().findByRole('heading').should('not.exist');
    dialog().findAllByRole('listitem').should('have.length', 3);
    cy.screenshot('validation-showcase-popover', { capture: 'viewport' });
    dialog().findByRole('button', { name: 'Standardvisning: alder' }).click();
    cy.get('#validation-default-age-0').should('have.focus');
    cy.get('#group-validation-default').screenshot('validation-showcase-default-edit');

    cy.get(row('mixed')).findByTestId('repeating-group-edit-button').click();
    cy.get('#group-validation-mixed').find(appFrontend.group.editContainer).as('mixedEditor');
    cy.get('@mixedEditor').find('#validation-mixed-name-0').should('not.exist');
    cy.get('@mixedEditor').find('#validation-mixed-species-0').should('be.visible');
    cy.get('@mixedEditor').find('#validation-mixed-age-0').should('be.visible');
    cy.get('#group-validation-mixed').screenshot('validation-showcase-mixed-edit');
    cy.get('#group-validation-table').findByTestId('repeating-group-edit-button').should('not.exist');
    cy.get('#group-validation-table').screenshot('validation-showcase-table-only');

    cy.get(row('table')).find(indicator).click();
    dialog().findByRole('button', { name: 'Kun tabell: navn' }).click();
    cy.get('#validation-table-name-0').should('have.focus');
  });

  it('targets a row container separately from the entire repeating group', () => {
    setup();
    cy.findByRole('checkbox', { name: 'På feltene' }).uncheck();
    cy.findByRole('checkbox', { name: 'På raden samlet' }).check();
    cy.waitUntilSaved();
    cy.get(appFrontend.errorReport).should(
      'contain.text',
      'Samlet kontroll: Balder: Kontroller opplysningene om dette kjæledyret samlet.',
    );
    for (const variant of variants) {
      cy.get(row(variant)).scrollIntoView({ offset: { top: -180, left: 0 } });
      cy.get(row(variant)).find(indicator).click({ scrollBehavior: false });
      dialog().findAllByRole('listitem').should('have.length', 1);
      dialog().should('contain.text', 'Samlet kontroll: Balder');
      if (variant === 'default') {
        cy.screenshot('validation-showcase-row-message', { capture: 'viewport' });
      }
      dialog().type('{esc}');
    }
    cy.findByRole('checkbox', { name: 'På raden samlet' }).uncheck();
    cy.findByRole('checkbox', { name: 'På hele gruppen' }).check();
    cy.waitUntilSaved();
    cy.get(appFrontend.errorReport).should(
      'contain.text',
      'Standardvisning: Kontroller kjæledyrene i denne gruppen samlet.',
    );
    for (const variant of variants) {
      cy.get(`#group-validation-${variant}`).find(indicator).should('not.exist');
    }
    cy.screenshot('validation-showcase-group-messages', { capture: 'fullPage' });
  });

  it('updates all four severity indicators and removes messages through the backend controls', () => {
    setup();
    const severities = [
      { label: 'Feil', color: 'danger' },
      { label: 'Advarsler', color: 'warning' },
      { label: 'Informasjon', color: 'info' },
      { label: 'Bekreftelser', color: 'success' },
    ];
    for (const item of severities) {
      cy.findByRole('checkbox', { name: item.label }).check();
    }
    cy.waitUntilSaved();
    cy.get(row('default')).find(indicator).click();
    dialog().findAllByRole('listitem').should('have.length', 6);
    dialog()
      .should('contain.text', 'Verdien må korrigeres.')
      .and('contain.text', 'Verdien er hentet fra eksempeldata.');
    dialog().type('{esc}');
    cy.get(row('default', 1)).find(indicator).click();
    dialog().findAllByRole('listitem').should('have.length', 6);
    dialog().should('contain.text', 'Kontroller at verdien stemmer.').and('contain.text', 'Verdien er kontrollert.');
    dialog().type('{esc}');
    for (const severity of severities) {
      for (const item of severities) {
        cy.findByRole('checkbox', { name: item.label }).uncheck();
      }
      cy.findByRole('checkbox', { name: severity.label }).check();
      cy.waitUntilSaved();
      for (const variant of variants) {
        cy.get(row(variant)).find(indicator).should('have.attr', 'data-color', severity.color);
      }
    }
    for (const item of severities) {
      cy.findByRole('checkbox', { name: item.label }).uncheck();
    }
    cy.waitUntilSaved();
    cy.get(indicator).should('not.exist');
    cy.get(appFrontend.errorReport).should('not.exist');
    cy.findByRole('checkbox', { name: 'På feltene' }).uncheck();
    cy.waitUntilSaved();
    cy.get(appFrontend.errorReport).should('not.exist');
    cy.findByRole('button', { name: /Neste/ }).click();
    cy.navPage('summary').should('have.attr', 'aria-current', 'page');
  });
});
