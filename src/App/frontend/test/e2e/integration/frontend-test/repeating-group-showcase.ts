import { AppFrontend } from 'test/e2e/pageobjects/app-frontend';

const appFrontend = new AppFrontend();
const variants = ['default', 'mixed', 'table'] as const;
const indicator = '[data-testid="row-validation-indicator"]';
const fieldIndicator = '[data-testid="table-field-validation-indicator"]';
const row = (variant: string, index = 0) => `#group-validation-${variant}-table-body > tr[data-row-num="${index}"]`;
const dialog = () => cy.findByRole('dialog', { name: 'Meldinger' });

function setup() {
  cy.viewport(1440, 1000);
  cy.goto('group');
  cy.gotoNavPage('Validering i grupper');
  cy.findByRole('button', { name: 'Last eksempeldata' }).click();
  cy.get('#group-validation-default-table-body > tr[data-row-num]').should('have.length', 7);
  cy.waitUntilSaved();
  cy.findByRole('button', { name: /Neste/ }).click();
  cy.get(appFrontend.errorReport).should('be.visible');
}

function openRow(variant: string, index: number) {
  cy.get(row(variant, index))
    .find(indicator)
    .scrollIntoView({ offset: { top: -300, left: 0 } });
  cy.get(row(variant, index)).find(indicator).click();
  dialog().should('be.visible');
}

function assertTableArrows() {
  cy.get('#group-validation-table-table-body > [data-for-row="4"] [data-validation-for]').should(($panels) => {
    expect($panels).to.have.length(2);
    for (const panel of $panels) {
      const field = panel
        .closest('tr')
        ?.previousElementSibling?.querySelector<HTMLElement>(
          `[data-validation-field="${panel.dataset.validationFor}"]`,
        );
      expect(field, 'arrow target').to.exist;
      const target = field!.getBoundingClientRect();
      const arrow = parseFloat(panel.style.getPropertyValue('--validation-arrow-position'));
      expect(Math.abs(panel.getBoundingClientRect().left + arrow - target.left - target.width / 2)).to.be.lessThan(2);
      expect(getComputedStyle(panel, '::before').content).to.equal('""');
    }
  });
}

describe('Repeating group validation showcase', () => {
  it('shows isolated messages, mixed severity and a clean row in every layout', () => {
    setup();
    const colors = ['danger', 'warning', 'info', 'success', 'danger'];
    for (const variant of variants) {
      for (const [index, color] of colors.entries()) {
        cy.get(row(variant, index)).find(indicator).should('have.attr', 'data-color', color);
      }
      cy.get(row(variant, 5)).find(indicator).should('not.exist');
      cy.get(row(variant, 5)).find(fieldIndicator).should('not.exist');
    }
    cy.get(row('mixed')).find(fieldIndicator).should('have.length', 1);
    cy.get(row('table')).find(fieldIndicator).should('have.length', 1);
    cy.get(row('table', 4)).find(fieldIndicator).should('have.length', 2);
    cy.get('#validation-table-species-0').should('have.attr', 'aria-invalid', 'false');
    cy.get('#validation-table-age-0').should('have.attr', 'aria-invalid', 'false');
    cy.get('#validation-table-name-0').should('have.attr', 'aria-invalid', 'true');
    cy.get('[data-validation="validation-table-name-0"]').parent().should('have.css', 'clip-path', 'inset(50%)');
    cy.get('#validation-table-name-0')
      .should('have.attr', 'aria-describedby')
      .and('include', 'validation-table-name-0-validations');
    cy.get('#validation-table-species-1').should(
      'have.attr',
      'aria-describedby',
      'validation-table-species-1-validations',
    );
    cy.get('#group-validation-table-table-body > [data-for-row="0"]')
      .should('contain.text', 'Navnet stemmer ikke med opplysningene i registeret.')
      .find('td')
      .should('have.attr', 'colspan', '4');
    cy.get(appFrontend.errorReport).findAllByRole('listitem').should('have.length', 12);
    cy.get(appFrontend.errorReport)
      .findAllByRole('button', { name: 'Navn' })
      .first()
      .should('have.css', 'text-decoration-line', 'underline')
      .parent()
      .findByText('Navnet stemmer ikke med opplysningene i registeret.')
      .should('be.visible');
    cy.injectAxe();
    cy.checkA11y();

    openRow('default', 4);
    dialog().findByRole('heading').should('not.exist');
    cy.get(appFrontend.errorReport)
      .find('ul')
      .then(($summaryList) => {
        dialog()
          .find('ul')
          .then(($popoverList) => {
            for (const property of ['fontSize', 'lineHeight', 'paddingLeft'] as const) {
              expect(getComputedStyle($popoverList[0])[property]).to.equal(getComputedStyle($summaryList[0])[property]);
            }
            const summaryEntry = $summaryList[0].querySelectorAll('li')[1];
            const popoverEntry = $popoverList[0].querySelectorAll('li')[1];
            expect(getComputedStyle(popoverEntry).marginTop).to.equal(getComputedStyle(summaryEntry).marginTop);
            expect(getComputedStyle(popoverEntry).padding).to.equal(getComputedStyle(summaryEntry).padding);
          });
      });
    dialog().findAllByRole('listitem').should('have.length', 2);
    dialog().findByRole('button', { name: 'Alder' }).click();
    cy.get('#validation-default-age-4').should('have.focus');

    cy.get('#group-validation-table-table-body > [data-for-row="1"]').should(
      'contain.text',
      'Dyreslaget er endret siden forrige innrapportering.',
    );
    cy.get('#group-validation-table-table-body > [data-for-row="4"] [data-validation-for]').should('have.length', 2);
    cy.get('#group-validation-table-table-body > [data-for-row="6"] [data-validation-for]')
      .find('li')
      .should('have.length', 2);
    cy.get('[data-validation-for]').find('button').should('not.exist');
    assertTableArrows();

    openRow('mixed', 2);
    dialog().findByRole('button', { name: 'Alder' }).click();
    cy.get('#validation-mixed-age-2').should('have.focus');
    cy.get('#group-validation-mixed').find(appFrontend.group.editContainer).as('mixedEditor');
    cy.get('@mixedEditor').find('#validation-mixed-name-2').should('not.exist');
    cy.get('@mixedEditor').find('#validation-mixed-species-2').should('be.visible');
    cy.get('#group-validation-table').findByTestId('repeating-group-edit-button').should('not.exist');

    openRow('table', 4);
    dialog().findAllByRole('listitem').should('have.length', 2);
    dialog().findByRole('button', { name: 'Navn' }).click();
    cy.get('#validation-table-name-4').should('have.focus');
    cy.viewport(1050, 1000);
    assertTableArrows();
    cy.get('#group-validation-table-table-body > [data-for-row="4"] [data-validation-for]').should('have.length', 2);
    cy.get(appFrontend.errorReport).findAllByRole('button', { name: 'Navn' }).first().click();
    cy.get('#validation-default-name-0').should('have.focus');
  });

  it('targets a row container separately from the entire repeating group', () => {
    setup();
    cy.findByRole('checkbox', { name: 'På feltene' }).uncheck();
    cy.findByRole('checkbox', { name: 'På raden samlet' }).check();
    cy.waitUntilSaved();
    cy.get(appFrontend.errorReport).should('contain.text', 'Samlet kontroll: Balder');
    for (const variant of variants) {
      openRow(variant, 0);
      dialog().findAllByRole('listitem').should('have.length', 1);
      dialog().should('contain.text', 'Denne meldingen gjelder opplysningene om kjæledyret samlet.');
      dialog().type('{esc}');
    }
    cy.findByRole('checkbox', { name: 'På raden samlet' }).uncheck();
    for (const label of ['Advarsler', 'Informasjon', 'Bekreftelser']) {
      cy.findByRole('checkbox', { name: label }).uncheck();
    }
    cy.findByRole('checkbox', { name: 'På hele gruppen' }).check();
    cy.waitUntilSaved();
    cy.get(appFrontend.errorReport).should('contain.text', 'Kontroller kjæledyrene i denne gruppen samlet.');
    for (const variant of variants) {
      cy.get(`#group-validation-${variant}`).find(indicator).should('not.exist');
      cy.get(`#group-validation-${variant}`).find(fieldIndicator).should('not.exist');
    }
  });

  it('filters the backend messages by severity without marking clean cells or rows', () => {
    setup();
    const severities = [
      { label: 'Feil', color: 'danger', index: 0 },
      { label: 'Advarsler', color: 'warning', index: 1 },
      { label: 'Informasjon', color: 'info', index: 2 },
      { label: 'Bekreftelser', color: 'success', index: 3 },
    ];
    for (const severity of severities) {
      for (const item of severities) {
        cy.findByRole('checkbox', { name: item.label }).uncheck();
      }
      cy.findByRole('checkbox', { name: severity.label }).check();
      cy.waitUntilSaved();
      for (const variant of variants) {
        cy.get(row(variant, severity.index)).find(indicator).should('have.attr', 'data-color', severity.color);
        cy.get(row(variant, 5)).find(indicator).should('not.exist');
      }
      cy.get('[data-testid="table-row-validation-errors"] [data-validation-for]').should(
        'have.attr',
        'data-color',
        severity.color,
      );
    }
    for (const item of severities) {
      cy.findByRole('checkbox', { name: item.label }).uncheck();
    }
    cy.waitUntilSaved();
    cy.get(indicator).should('not.exist');
    cy.get(fieldIndicator).should('not.exist');
    cy.get(appFrontend.errorReport).should('not.exist');
    cy.findByRole('button', { name: /Neste/ }).click();
    cy.navPage('summary').should('have.attr', 'aria-current', 'page');
  });
});
