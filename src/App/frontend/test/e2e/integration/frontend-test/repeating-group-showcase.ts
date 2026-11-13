import { AppFrontend } from 'test/e2e/pageobjects/app-frontend';
import { interceptAltinnAppGlobalData } from 'test/e2e/support/intercept-global-data';

import type { FormBootstrapResponse } from 'src/features/formBootstrap/types';
import type { ActionResult } from 'src/layout/CustomButton/CustomButtonComponent';

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
      const arrow = field!.querySelector('[data-validation-arrow]');
      expect(arrow, 'field arrow').to.exist;
      const bounds = arrow!.getBoundingClientRect();
      expect(Math.abs(bounds.left + bounds.width / 2 - target.left - target.width / 2)).to.be.lessThan(2);
      expect(bounds.top, 'arrow overlaps panel border').to.be.lessThan(panel.getBoundingClientRect().top);
      expect(bounds.bottom).to.be.greaterThan(panel.getBoundingClientRect().top);
    }
  });
}

describe('Repeating group validation showcase', () => {
  it('contains examples to seeded rows while preserving edits and mixed row order', () => {
    cy.viewport(1440, 1000);
    cy.intercept('GET', '**/bootstrap-form/Task_3**').as('showcaseBootstrap');
    cy.goto('group');
    cy.gotoNavPage('Validering i grupper');
    for (const variant of variants) {
      cy.get(`#group-validation-${variant}`).should('not.exist');
    }
    cy.findByRole('checkbox', { name: 'På feltene' }).should('not.exist');
    cy.findByRole('button', { name: /Neste/ }).should('be.visible');
    cy.findByRole('button', { name: 'Last eksempeldata' }).click();
    cy.waitUntilSaved();
    cy.get('@showcaseBootstrap').then(({ request, response }) => {
      const bootstrap: FormBootstrapResponse = response!.body;
      const url = `${request.url.split('/bootstrap-form/')[0]}/data/${bootstrap.dataModels['nested-group'].dataElementId}`;
      cy.getCookie('XSRF-TOKEN').then((token) => {
        const headers = { 'X-XSRF-TOKEN': token?.value };
        cy.request(url).then(({ body }) => {
          body.Pets = [
            { UniqueId: 'legacy-pet', Name: 'Legacy', Species: 'Dog', Age: 1 },
            { UniqueId: 'validation-showcase-milo', Name: 'Milo', Species: 'Dog', Age: 12 },
          ];
          cy.request({ method: 'PUT', url, headers, body });
          cy.reload();
          cy.waitForLoad();
          cy.get('#validation-table-name-1').clear();
          cy.get('#validation-table-name-1').type('Milo endret');
          cy.get('#validation-table-age-1').clear();
          cy.get('#validation-table-age-1').type('13');
          cy.dsSelect('#validation-table-species-1', 'Katt Ofte sett i morsomme videoer på nettet');
          cy.findByRole('checkbox', { name: 'På raden samlet' }).check();
          cy.waitUntilSaved();
          for (const variant of variants) {
            cy.get(`#group-validation-${variant}`).should('be.visible');
          }
          cy.request(url).then(({ body: edited }) => {
            edited.Pets = edited.Pets.filter((pet: { UniqueId: string }) => pet.UniqueId === 'legacy-pet');
            cy.request({ method: 'PUT', url, headers, body: edited });
          });
          cy.reload();
          cy.waitForLoad();
          for (const variant of variants) {
            cy.get(`#group-validation-${variant}`).should('not.exist');
          }
          cy.findByRole('checkbox', { name: 'På feltene' }).should('not.exist');
          cy.findByRole('button', { name: 'Last eksempeldata' }).should('be.visible');
          cy.findByRole('button', { name: /Neste/ }).should('be.visible');
        });
      });
    });
  });

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
    cy.get('[data-validation="validation-table-name-0"]').should('have.css', 'clip-path', 'inset(50%)');
    cy.get('[data-validation="validation-table-name-0"]').should('have.attr', 'aria-live', 'assertive');
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
      .findAllByRole('button', { name: 'Navnet stemmer ikke med opplysningene i registeret.' })
      .should('have.length', 3);
    cy.injectAxe();
    cy.checkA11y();

    openRow('default', 4);
    dialog().findByRole('heading').should('not.exist');
    dialog().findAllByRole('listitem').should('have.length', 2);
    dialog().findByRole('button', { name: 'Navn' }).should('not.exist');
    dialog().findByRole('button', { name: 'Alder' }).should('not.exist');
    dialog().find('button[data-target-node="validation-default-age-4"]').click();
    cy.get('#validation-default-age-4').should('have.focus');
    openRow('default', 3);
    dialog().find('button[data-target-node="validation-default-age-3"]').click();
    cy.get('#validation-default-age-3').should('have.focus');

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

    cy.get(row('mixed', 0)).findByTestId('repeating-group-edit-button').click();
    cy.get(row('mixed', 0))
      .find('td')
      .first()
      .then(($cell) => {
        cy.get('#group-validation-mixed-table-body > [data-for-row="0"] > td')
          .should('have.css', 'background-color', $cell.css('background-color'))
          .and('have.css', 'border-bottom-width', '0px');
      });
    cy.get(row('mixed', 0)).findByTestId('repeating-group-edit-button').click();
    cy.get('#group-validation-mixed-table-body > [data-for-row="0"] > td').should(
      'have.css',
      'border-bottom-width',
      '1px',
    );

    openRow('mixed', 2);
    dialog().find('button[data-target-node="validation-mixed-age-2"]').click();
    cy.get('#validation-mixed-age-2').should('have.focus');
    cy.get('#group-validation-mixed').find(appFrontend.group.editContainer).as('mixedEditor');
    cy.get('@mixedEditor').find('#validation-mixed-name-2').should('not.exist');
    cy.get('@mixedEditor').find('#validation-mixed-species-2').should('be.visible');
    cy.get('#group-validation-table').findByTestId('repeating-group-edit-button').should('not.exist');

    openRow('table', 4);
    dialog().findAllByRole('listitem').should('have.length', 2);
    dialog().find('button[data-target-node="validation-table-name-4"]').click();
    cy.get('#validation-table-name-4').should('have.focus');
    cy.viewport(1050, 1000);
    assertTableArrows();
    cy.get('#validation-table-species-4').invoke('css', 'height', '100px');
    assertTableArrows();
    cy.get('#validation-table-species-4').invoke('css', 'height', '');
    cy.get('#group-validation-table-table-body > [data-for-row="4"] [data-validation-for]').should('have.length', 2);
    cy.get(appFrontend.errorReport)
      .findAllByRole('button', { name: 'Navnet stemmer ikke med opplysningene i registeret.' })
      .first()
      .click();
    cy.get('#validation-default-name-0').should('have.focus');
  });

  it('preserves configured edit labels, rich message links and keyboard navigation while rows are open', () => {
    interceptAltinnAppGlobalData((data) => {
      data.textResources?.resources.push({
        id: 'row.warning',
        value:
          'Kontroller **alderen {0}**.\n\n- Kontroller registeret.\n- [Les mer](https://www.altinn.no/)\n\n<a href="../repeating" data-link-type="LinkToPotentialPage">Se beløp</a>',
        variables: [{ key: 'age', dataSource: 'customTextParameters' }],
      });
    });
    cy.intercept('POST', '**/actions*', (req) => {
      req.on('response', (res) => {
        const action: ActionResult = res.body;
        for (const groups of Object.values(action.updatedValidationIssues ?? {})) {
          for (const issue of Object.values(groups).flat()) {
            if (issue.componentId === 'validation-default-age' && issue.rowIndexes?.[0] === 4) {
              issue.customTextKey = 'row.warning';
              issue.customTextParameters = { age: '12' };
            }
          }
        }
        res.send(action);
      });
    });
    setup();
    cy.changeLayout((component) => {
      if (component.id === 'validation-default') {
        component.textResourceBindings = {
          ...component.textResourceBindings,
          editButtonOpen: 'Se og endre',
          editButtonClose: 'Lukk raden',
        };
      }
    });
    cy.get(row('default', 4)).findByRole('button', { name: 'Se og endre Milo' }).should('be.visible');
    openRow('default', 4);
    dialog().should('be.focused').children('ul').children('li').should('have.length', 2);
    dialog().find('li > [data-field="validation"]').first().should('have.attr', 'data-color', 'danger');
    dialog().find('li > [data-field="validation"]').last().should('have.attr', 'data-color', 'warning');
    dialog().findAllByRole('button', { name: 'Vis i skjemaet' }).should('have.length', 2);
    dialog().find('strong').should('have.text', 'alderen 12');
    dialog().find('li li').should('have.length', 2);
    dialog()
      .find('button[data-target-node="validation-default-age-4"]')
      .should(($action) => {
        const messageId = $action.attr('aria-describedby')!;
        expect($action[0].ownerDocument.getElementById(messageId)?.textContent).to.contain('Kontroller alderen 12.');
      });
    dialog().contains('p', 'Kontroller').click();
    dialog().should('be.visible');
    dialog()
      .findByRole('link', { name: 'Les mer' })
      .should('have.attr', 'href', 'https://www.altinn.no/')
      .then(($link) => {
        expect($link.closest('button')).to.have.length(0);
        $link[0].addEventListener('click', (event) => event.preventDefault(), { once: true });
      })
      .click();
    dialog().should('be.visible');
    cy.injectAxe();
    cy.checkA11y('[data-testid="row-validation-messages"]:popover-open');
    dialog().findByRole('link', { name: 'Se beløp' }).click();
    cy.location('pathname').should('include', '/repeating');
    cy.gotoNavPage('Validering i grupper');
    openRow('default', 4);
    dialog().type('{esc}');
    cy.get(row('default', 4)).find(indicator).should('be.focused').and('have.attr', 'aria-expanded', 'false');
    cy.press('Space');
    dialog().should('be.focused');
    cy.press('Tab');
    cy.focused().should('have.attr', 'aria-label', 'Lukk');
    cy.press('Space');
    cy.get(row('default', 4)).find(indicator).should('be.focused');
    cy.press('Space');
    dialog().find('button[data-target-node="validation-default-name-4"]').click();
    cy.get('#validation-default-name-4').should('have.focus');
    cy.get('#validation-default-name-4')
      .closest('[data-componentid]')
      .should('contain.text', 'Oppgi navnet slik det står i registeret.');
    cy.get(row('default', 4)).findByRole('button', { name: 'Lukk raden Milo' }).should('be.visible');
    openRow('default', 4);
    dialog().find('button[data-target-node="validation-default-name-4"]').focus();
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
    cy.get('#validation-default-name-4').should('have.focus');
    dialog().should('not.exist');
    cy.get(appFrontend.errorReport)
      .should('contain.text', 'Oppgi navnet slik det står i registeret.')
      .and('not.contain.text', 'Kontroller alderen');
  });

  for (const mode of ['onlyTable', 'hidden-actions', 'compact-vertical-mobile'] as const) {
    it(`keeps indicators available in ${mode}`, () => {
      setup();
      cy.changeLayout((component) => {
        if (component.id === 'validation-default' && component.type === 'RepeatingGroup') {
          component.edit =
            mode === 'onlyTable'
              ? { mode: 'onlyTable', deleteButton: false }
              : mode === 'hidden-actions'
                ? { editButton: false, deleteButton: false }
                : { compactButtons: true, buttonLayout: 'vertical' };
        }
      });
      if (mode === 'compact-vertical-mobile') {
        cy.viewport(390, 844);
      }
      cy.get(row('default')).find(indicator).should('have.attr', 'data-color', 'danger');
      cy.get(row('default', 1)).find(indicator).should('have.attr', 'data-color', 'warning');
      openRow('default', 0);
      dialog().find('button[data-target-node="validation-default-name-0"]').click();
      cy.get(row('default')).find(indicator).should('have.attr', 'aria-expanded', 'false');
      if (mode !== 'hidden-actions') {
        cy.get('#validation-default-name-0').should('have.focus');
      }
      if (mode === 'onlyTable') {
        cy.get('#group-validation-default').findByTestId('repeating-group-edit-button').should('not.exist');
      }
    });
  }

  it('targets a row container separately from the entire repeating group', () => {
    setup();
    cy.findByRole('checkbox', { name: 'På feltene' }).uncheck();
    cy.findByRole('checkbox', { name: 'På raden samlet' }).check();
    cy.waitUntilSaved();
    cy.get(appFrontend.errorReport).should(
      'contain.text',
      'Denne meldingen gjelder opplysningene om kjæledyret samlet.',
    );
    for (const variant of variants) {
      openRow(variant, 0);
      dialog().findAllByRole('listitem').should('have.length', 1);
      dialog().should('contain.text', 'Denne meldingen gjelder opplysningene om kjæledyret samlet.');
      dialog().type('{esc}');
    }
    openRow('table', 0);
    dialog().find('button[data-target-node="validation-table-row-0"]').focus().click();
    dialog().should('not.exist');
    cy.get(row('table', 0)).find(indicator).should('have.focus').and('have.attr', 'aria-expanded', 'false');
    cy.findByRole('checkbox', { name: 'På raden samlet' }).uncheck();
    cy.findByRole('checkbox', { name: 'På hele gruppen' }).check();
    cy.waitUntilSaved();
    cy.get(appFrontend.errorReport).should('contain.text', 'Kontroller kjæledyrene i denne gruppen samlet.');
    for (const variant of variants) {
      cy.get(`#group-validation-${variant}`).find(indicator).should('not.exist');
      cy.get(`#group-validation-${variant}`).find(fieldIndicator).should('not.exist');
    }
  });

  it('clears validations when all targets are disabled', () => {
    setup();
    cy.findByRole('checkbox', { name: 'På feltene' }).uncheck();
    cy.waitUntilSaved();
    cy.get(indicator).should('not.exist');
    cy.get(fieldIndicator).should('not.exist');
    cy.get(appFrontend.errorReport).should('not.exist');
    cy.findByRole('button', { name: /Neste/ }).click();
    cy.navPage('summary').should('have.attr', 'aria-current', 'page');
  });
});
