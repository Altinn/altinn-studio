import type { PageValidation } from '@app/layout-contract/generated/common.generated';

import { AppFrontend } from 'test/e2e/pageobjects/app-frontend';
import { interceptAltinnAppGlobalData } from 'test/e2e/support/intercept-global-data';

const appFrontend = new AppFrontend();
const required: PageValidation = { page: 'current', show: ['Required'] };
const custom: PageValidation = { page: 'current', show: ['CustomBackend'] };

function configureValidation(inherited: PageValidation, forward?: PageValidation, backward?: PageValidation) {
  interceptAltinnAppGlobalData((globalData) => {
    globalData.ui.settings = { ...globalData.ui.settings, validationOnNavigation: inherited };
    globalData.ui.folders.Task_3.pages.validationOnNavigation = inherited;
  });
  cy.interceptLayout(
    'Task_3',
    (component) => {
      if ('required' in component) {
        component.required = false;
      }
      if (component.type === 'NavigationButtons') {
        component.validateOnNext = forward;
        component.validateOnPrevious = backward;
      }
      if (component.type === 'NavigationBar') {
        component.validateOnForward = forward;
        component.validateOnBackward = backward;
      }
    },
    (layouts) => {
      for (const page of ['prefill', 'repeating']) {
        layouts[page].data.validationOnNavigation = inherited;
        layouts[page].data.layout.push({
          id: `validation-precedence-${page}`,
          type: 'Input',
          required: true,
          dataModelBindings: {
            simpleBinding: { dataType: 'nested-group', field: page === 'prefill' ? 'HiddenPets' : 'PetSortOrder' },
          },
          textResourceBindings: { title: 'Required field' },
        });
      }
    },
  );
}

for (const component of ['NavigationButtons', 'NavigationBar'] as const) {
  describe(`${component} validation precedence`, () => {
    function navigate(direction: 'forward' | 'backward') {
      if (component === 'NavigationButtons') {
        cy.findByRole('button', { name: direction === 'forward' ? 'Neste' : 'Forrige' }).click();
      } else {
        cy.get('[data-testid="NavigationBar"]')
          .findByRole('button', { name: direction === 'forward' ? /^2\./ : /^1\./ })
          .click();
      }
    }

    it('uses an explicit empty forward list and honors explicit backward validation over inherited rules', () => {
      configureValidation(required, { page: 'current', show: [] }, required);
      cy.goto('group');

      navigate('forward');
      cy.navPage('repeating').should('have.attr', 'aria-current', 'page');

      navigate('backward');
      cy.get(appFrontend.errorReport).should('be.visible');
      cy.navPage('repeating').should('have.attr', 'aria-current', 'page');

      cy.findByRole('textbox', { name: /Required field/ }).type('Completed');
      navigate('backward');
      cy.navPage('prefill').should('have.attr', 'aria-current', 'page');
    });

    it('uses stricter component validation than the inherited rules', () => {
      configureValidation(custom, required);
      cy.goto('group');

      navigate('forward');
      cy.get(appFrontend.errorReport).should('be.visible');
      cy.navPage('prefill').should('have.attr', 'aria-current', 'page');

      cy.findByRole('textbox', { name: /Required field/ }).type('Completed');
      navigate('forward');
      cy.navPage('repeating').should('have.attr', 'aria-current', 'page');
    });

    it('inherits forward validation without enabling backward validation', () => {
      configureValidation(required);
      cy.goto('group');

      navigate('forward');
      cy.get(appFrontend.errorReport).should('be.visible');
      cy.navPage('prefill').should('have.attr', 'aria-current', 'page');

      cy.findByRole('textbox', { name: /Required field/ }).type('Completed');
      navigate('forward');
      cy.navPage('repeating').should('have.attr', 'aria-current', 'page');

      navigate('backward');
      cy.navPage('prefill').should('have.attr', 'aria-current', 'page');
    });
  });
}
