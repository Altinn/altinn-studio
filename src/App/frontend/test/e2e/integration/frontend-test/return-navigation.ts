import type { PageValidation } from '@app/layout-contract/generated/common.generated';
import type { CompNavigationButtonsExternal } from '@app/layout-contract/generated/components/NavigationButtons/config.generated';

import { interceptAltinnAppGlobalData } from 'test/e2e/support/intercept-global-data';

type ReturnKind = 'Summary' | 'Summary2' | 'linkToPage' | 'linkToComponent';
type ValidationSettings = {
  validationOnNavigation?: PageValidation;
  validateOnBackToSummary?: PageValidation;
};

const required: PageValidation = { page: 'current', show: ['Required'] };
const disabled: PageValidation = { page: 'current', show: [] };

function configure({
  kind = 'Summary2',
  component = { validateOnNext: required },
  page = {},
  task = {},
  app = {},
  extraVisible = false,
}: {
  kind?: ReturnKind;
  component?: Pick<CompNavigationButtonsExternal, 'validateOnNext' | 'validateOnBackToSummary'>;
  page?: ValidationSettings;
  task?: ValidationSettings;
  app?: ValidationSettings;
  extraVisible?: boolean;
} = {}) {
  interceptAltinnAppGlobalData((data) => {
    data.ui.settings = { ...data.ui.settings, ...app };
    data.ui.folders.Task_2.pages = {
      order: ['form', 'return-extra', 'summary', 'return-followup'],
      ...task,
    };
  });
  cy.interceptLayout('Task_2', undefined, (layouts) => {
    const name = layouts.form!.data.layout.find((item) => item.id === 'newFirstName');
    const middleName = layouts.form!.data.layout.find((item) => item.id === 'newMiddleName');
    if (name?.type !== 'Input' || middleName?.type !== 'Input') {
      throw new Error('The name inputs must be present in frontend-test');
    }
    layouts.form = {
      data: {
        ...page,
        layout: [
          { id: 'form-pages', type: 'NavigationBar' },
          {
            ...name,
            id: 'return-name',
            textResourceBindings: { title: 'Navn' },
            showValidations: [],
          },
          { ...middleName, id: 'return-toggle', textResourceBindings: { title: 'Vis ekstra side' } },
          { id: 'return-navigation', type: 'NavigationButtons', ...component },
        ],
      },
    };
    layouts['return-extra'] = {
      data: {
        hidden: extraVisible
          ? ['equals', ['component', 'return-toggle'], 'hide']
          : ['notEquals', ['component', 'return-toggle'], 'show'],
        validationOnNavigation: required,
        layout: [
          { id: 'extra-pages', type: 'NavigationBar' },
          {
            ...middleName,
            id: 'extra-required',
            required: true,
            showValidations: [],
            textResourceBindings: { title: 'Ekstra felt' },
          },
          { id: 'extra-navigation', type: 'NavigationButtons' },
        ],
      },
    };
    layouts['return-followup'] = {
      data: {
        hidden: ['notEquals', ['component', 'return-toggle'], 'after'],
        layout: [
          { id: 'followup-pages', type: 'NavigationBar' },
          { id: 'followup-title', type: 'Paragraph', textResourceBindings: { title: 'Oppfølging' } },
        ],
      },
    };
    const summary =
      kind === 'Summary'
        ? { id: 'return-summary', type: 'Summary' as const, componentRef: 'return-name' }
        : {
            id: 'return-summary',
            type: 'Summary2' as const,
            target: { type: 'component' as const, id: 'return-name' },
          };
    layouts.summary = {
      data: {
        layout: [
          { id: 'summary-pages', type: 'NavigationBar' },
          summary,
          {
            id: 'return-link',
            type: 'Paragraph',
            textResourceBindings: {
              title: [
                kind === 'linkToComponent' ? 'linkToComponent' : 'linkToPage',
                'Rediger via lenke',
                kind === 'linkToComponent' ? 'return-name' : 'form',
                true,
              ],
            },
          },
          { id: 'summary-navigation', type: 'NavigationButtons', validateOnNext: disabled },
        ],
      },
    };
  });
  cy.goto('changename');
  cy.findByRole('textbox', { name: 'Navn' }).type('Anne');
  if (extraVisible) {
    cy.findByRole('textbox', { name: 'Vis ekstra side' }).type('ready');
  }
  cy.gotoNavPage('summary');
  if (kind === 'linkToPage' || kind === 'linkToComponent') {
    cy.findByRole('link', { name: 'Rediger via lenke' }).click();
  } else {
    cy.findByRole('button', { name: /Endre/ }).click();
  }
  cy.findByRole('textbox', { name: 'Navn' }).should('be.visible');
}

function returnButton() {
  return cy.findByRole('button', { name: /^Tilbake til (oppsummering|summary)$/ });
}

describe('Return navigation', () => {
  for (const kind of ['Summary', 'Summary2', 'linkToPage', 'linkToComponent'] as const) {
    it(`inherits the edited page's Next validation for ${kind}`, () => {
      configure({ kind });
      cy.findByRole('textbox', { name: 'Navn' }).clear();
      returnButton().click();
      cy.navPage('form').should('have.attr', 'aria-current', 'page');
      cy.findByRole('textbox', { name: 'Navn' }).should('have.attr', 'aria-invalid', 'true');
      cy.findByRole('textbox', { name: 'Navn' }).type('Anne');
      returnButton().click();
      cy.navPage('summary').should('have.attr', 'aria-current', 'page');
    });
  }

  it('lets an explicit component return override disable page-level validation', () => {
    configure({ component: { validateOnBackToSummary: disabled }, page: { validationOnNavigation: required } });
    cy.findByRole('textbox', { name: 'Navn' }).clear();
    returnButton().click();
    cy.navPage('summary').should('have.attr', 'aria-current', 'page');
  });

  it('preserves visible errors when return validation is disabled', () => {
    configure({ kind: 'linkToPage', component: { validateOnNext: required, validateOnBackToSummary: disabled } });
    cy.findByRole('textbox', { name: 'Navn' }).clear();
    cy.findByRole('button', { name: 'Neste' }).click();
    cy.findByRole('textbox', { name: 'Navn' }).should('have.attr', 'aria-invalid', 'true');
    returnButton().click();
    cy.navPage('summary').should('have.attr', 'aria-current', 'page');
    cy.findByRole('link', { name: 'Rediger via lenke' }).click();
    cy.get('#return-name-validations').should('be.visible').and('contain.text', 'Du må fylle ut navn');
  });

  it('uses component Next validation before an explicit page return default', () => {
    configure({ page: { validateOnBackToSummary: disabled } });
    cy.findByRole('textbox', { name: 'Navn' }).clear();
    returnButton().click();
    cy.navPage('form').should('have.attr', 'aria-current', 'page');
    cy.findByRole('textbox', { name: 'Navn' }).should('have.attr', 'aria-invalid', 'true');
  });

  it('uses page Next validation before a task return default', () => {
    configure({
      component: {},
      page: { validationOnNavigation: required },
      task: { validateOnBackToSummary: disabled },
    });
    cy.findByRole('textbox', { name: 'Navn' }).clear();
    returnButton().click();
    cy.navPage('form').should('have.attr', 'aria-current', 'page');
    cy.findByRole('textbox', { name: 'Navn' }).should('have.attr', 'aria-invalid', 'true');
  });

  it('uses task Next validation before an app return default', () => {
    configure({
      component: {},
      task: { validationOnNavigation: required },
      app: { validateOnBackToSummary: disabled },
    });
    cy.findByRole('textbox', { name: 'Navn' }).clear();
    returnButton().click();
    cy.navPage('form').should('have.attr', 'aria-current', 'page');
    cy.findByRole('textbox', { name: 'Navn' }).should('have.attr', 'aria-invalid', 'true');
  });

  it('inherits app return validation when narrower settings are absent', () => {
    configure({ component: {}, app: { validateOnBackToSummary: required } });
    cy.findByRole('textbox', { name: 'Navn' }).clear();
    returnButton().click();
    cy.navPage('form').should('have.attr', 'aria-current', 'page');
    cy.findByRole('textbox', { name: 'Navn' }).should('have.attr', 'aria-invalid', 'true');
  });

  it('allows returning when all-page validation finds only a future-page error', () => {
    configure({ component: { validateOnBackToSummary: { page: 'all', show: ['Required'] } }, extraVisible: true });
    cy.findByRole('textbox', { name: 'Vis ekstra side' }).clear();
    returnButton().click();
    cy.navPage('summary').should('have.attr', 'aria-current', 'page');
    cy.gotoNavPage('return-extra');
    cy.get('#extra-required-validations').should('be.visible');
  });

  for (const kind of ['Summary2', 'linkToPage'] as const) {
    it(`resets ${kind} when an intervening page appears and does not restore it after undo`, () => {
      configure({ kind });
      cy.findByRole('textbox', { name: 'Vis ekstra side' }).type('show');
      returnButton().should('not.exist');
      cy.findByRole('textbox', { name: 'Vis ekstra side' }).should('be.focused');
      cy.findByRole('button', { name: 'Neste' }).should('be.visible');
      cy.findByRole('textbox', { name: 'Vis ekstra side' }).clear();
      returnButton().should('not.exist');
      cy.gotoNavPage('summary');
    });

    it(`resets ${kind} when an intervening page disappears`, () => {
      configure({ kind, extraVisible: true });
      cy.findByRole('textbox', { name: 'Vis ekstra side' }).clear();
      cy.findByRole('textbox', { name: 'Vis ekstra side' }).type('hide');
      returnButton().should('not.exist');
      cy.findByRole('button', { name: 'Neste' }).should('be.visible');
    });

    it(`keeps ${kind} when a page after the return destination appears`, () => {
      configure({ kind });
      cy.findByRole('textbox', { name: 'Vis ekstra side' }).type('after');
      returnButton().should('be.visible').click();
      cy.navPage('summary').should('have.attr', 'aria-current', 'page');
    });
  }
});
