import { AppFrontend } from 'test/e2e/pageobjects/app-frontend';
import JQueryWithSelector = Cypress.JQueryWithSelector;
import deepEqual from 'fast-deep-equal';
import type axe from 'axe-core';
import type { Options as AxeOptions } from 'cypress-axe';

import { breakpoints } from 'src/hooks/useIsMobile';
import { getInstanceIdRegExp } from 'src/utils/instanceIdRegExp';
import type { ILayouts } from 'src/layout/layout';

const appFrontend = new AppFrontend();

Cypress.Commands.add('assertTextWithoutWhiteSpaces', { prevSubject: true }, (subject, expectedText) => {
  const normalWhiteSpace = (subject[0].value || ' ').replace(/\u00a0/g, ' ');
  expect(normalWhiteSpace).to.equal(expectedText || ' ');
});

Cypress.Commands.add('isVisible', { prevSubject: true }, (subject) => {
  const isVisible = (elem) => !!(elem.offsetWidth || elem.offsetHeight || elem.getClientRects().length);
  expect(isVisible(subject[0])).to.be.true;
});

Cypress.Commands.add('dsCheck', { prevSubject: true }, (subject: JQueryWithSelector | undefined) => {
  cy.log('Checking');
  if (subject && !subject.is(':checked')) {
    cy.wrap(subject).parent().click();
  }
});

Cypress.Commands.add('dsUncheck', { prevSubject: true }, (subject: JQueryWithSelector | undefined) => {
  cy.log('Unchecking');
  if (subject && subject.is(':checked')) {
    cy.wrap(subject).parent().click();
  }
});

Cypress.Commands.add('dsSelect', { prevSubject: true }, (subject: JQueryWithSelector | undefined, name) => {
  cy.log(`Selecting ${name}`);
  cy.wrap(subject).click();
  cy.findByRole('option', { name }).click();
  cy.get('body').click();
  cy.wrap(subject);
});

Cypress.Commands.add('clickAndGone', { prevSubject: true }, (subject: JQueryWithSelector | undefined) => {
  // eslint-disable-next-line cypress/unsafe-to-chain-command
  cy.wrap(subject).click().should('not.exist');
});

Cypress.Commands.add('navPage', (page: string) => {
  cy.window().then((win) => {
    if (win.innerWidth < 768) {
      cy.get(appFrontend.navMobileMenu).should('have.attr', 'aria-expanded', 'false').click();
    }
    cy.get(appFrontend.navMenu).findByText(page).parent();
  });
});

Cypress.Commands.add('gotoNavPage', (page: string) => {
  cy.navPage(page).click();
  cy.navPage(page).should('have.attr', 'aria-current', 'page');
});

Cypress.Commands.add('numberFormatClear', { prevSubject: true }, (subject: JQueryWithSelector | undefined) => {
  cy.log('Clearing number formatted input field');
  if (!subject) {
    throw new Error('Subject is undefined');
  }

  // Since we cannot use {selectall} on number formatted input fields, because react-number-format messes with
  // our selection, we need to delete the content by moving to the start of the input field and deleting one
  // character at a time.
  const strLength = subject.val()?.toString().length;
  const del = new Array(strLength).fill('{del}').join('');

  // We also add {moveToStart} multiple times to ensure that we are at the start of the input field, as
  // react-number-format messes with our cursor position here as well.
  const moveToStart = new Array(5).fill('{moveToStart}').join('');

  cy.wrap(subject).type(`${moveToStart}${del}`);
});

interface KnownViolation extends Pick<axe.Result, 'id'> {
  spec: string;
  test: string;
  nodeLength: number;
  countTowardsExpected?: false;
}

// TODO: Fix all violations and remove this list
const knownWcagViolations: KnownViolation[] = [
  {
    spec: 'frontend-test/all-process-steps.ts',
    test: 'Should be possible to fill out all steps from beginning to end',
    id: 'landmark-unique',
    nodeLength: 1,
    countTowardsExpected: false,
  },
  {
    spec: 'frontend-test/all-process-steps.ts',
    test: 'Should be possible to fill out all steps from beginning to end',
    id: 'list',
    nodeLength: 2,
  },
  {
    spec: 'frontend-test/grid.ts',
    test: 'should work with basic table functionality',
    id: 'list',
    nodeLength: 1,
  },
  {
    spec: 'frontend-test/group.ts',
    test: 'Validation on group',
    id: 'color-contrast',
    nodeLength: 1,
  },
  {
    spec: 'frontend-test/group.ts',
    test: 'Validation on group',
    id: 'list',
    nodeLength: 1,
  },
  {
    spec: 'frontend-test/group.ts',
    test: 'Opens delete warning popup when alertOnDelete is true and deletes on confirm',
    id: 'aria-dialog-name',
    nodeLength: 1,
  },
  {
    spec: 'frontend-test/hide-row-in-group.ts',
    test: 'should be possible to hide rows when "Endre fra" is greater or equals to [...]',
    id: 'heading-order',
    nodeLength: 1,
  },
  {
    spec: 'frontend-test/likert.ts',
    test: 'Should show validation message for required likert',
    id: 'list',
    nodeLength: 2,
  },
  {
    spec: 'frontend-test/on-entry.ts',
    test: 'is possible to select an existing instance',
    id: 'svg-img-alt',
    nodeLength: 3,
  },
  {
    spec: 'frontend-test/reportee-selection.ts',
    test: 'Prompts for party when doNotPromptForParty = false, on instantiation with multiple possible parties',
    id: 'label',
    nodeLength: 2,
  },
  {
    spec: 'signing-test/double-signing.ts',
    test: 'accountant -> manager -> auditor',
    id: 'list',
    nodeLength: 2,
  },
  {
    spec: 'anonymous-stateless-app/validation.ts',
    test: 'Should show validation message for missing name',
    id: 'list',
    nodeLength: 1,
  },
];

Cypress.Commands.add('clearSelectionAndWait', (viewport) => {
  cy.get('#readyForPrint').should('exist');

  // Find focused element and blur it, to ensure that we don't get any focus outlines or styles in the snapshot.
  cy.window().then((win) => {
    const focused = win.document.activeElement;
    if (focused && 'blur' in focused && typeof focused.blur === 'function') {
      focused.blur();
    }
  });

  // eslint-disable-next-line cypress/unsafe-to-chain-command
  cy.focused().should('not.exist');

  // Wait for elements marked as loading are not loading anymore
  cy.get('[data-is-loading=true]').should('not.exist');

  if (viewport) {
    cy.get(`html.viewport-is-${viewport}`).should('be.visible');
  }

  // Work around slow state updates in Dropdown (possibly in combination with preselectedOptionIndex)
  cy.window().then((win) => {
    const state = win.reduxStore.getState();
    cy.waitUntil(() => {
      const allDropdowns = win.document.querySelectorAll('[data-componenttype="Dropdown"]');
      const asArray = Array.from(allDropdowns);
      for (const dropdown of asArray) {
        const inputInside = dropdown.querySelector('input');
        if (!inputInside) {
          return false;
        }
        const baseId = dropdown.getAttribute('data-componentbaseid');
        const currentPageName = state.formLayout.uiConfig.currentView;
        const currentPage = state.formLayout.layouts && state.formLayout.layouts[currentPageName];
        const componentDef = currentPage?.find((c) => c.id === baseId);
        if (!componentDef) {
          throw new Error(`Could not find component definition for dropdown with id ${baseId}`);
        }
        if (
          componentDef.type === 'Dropdown' &&
          componentDef.preselectedOptionIndex !== undefined &&
          !inputInside.value
        ) {
          return false;
        }

        const activeDescendant = dropdown.getAttribute('aria-activedescendant');
        if (!activeDescendant) {
          return true;
        }
        const activeDescendantElement = win.document.getElementById(activeDescendant);
        if ((activeDescendant && !inputInside.value) || !activeDescendantElement) {
          // Dropdown has selected value, but this has not yet been reflected in the input field value.
          // We should wait until this has happened.
          return false;
        }
      }

      return true;
    });
  });
});

Cypress.Commands.add('snapshot', (name: string) => {
  cy.clearSelectionAndWait();

  // Running wcag tests before taking snapshot, because the resizing of the viewport can cause some elements to
  // re-render and go slightly out of sync with the proper state of the application. One example is the Dropdown
  // component, which can sometimes render without all the options (and selected value) a short time after resizing.
  cy.testWcag();

  cy.window().then((win) => {
    const { innerWidth, innerHeight } = win;
    cy.readFile('test/percy.css').then((percyCSS) => {
      cy.log(`Taking snapshot with Percy: ${name}`);

      // We need to manually resize the viewport to ensure that the snapshot is taken with the correct DOM. We sometimes
      // change the DOM based on the viewport size, and Percy only understands CSS media queries (not our React logic).
      const viewportSizes = {
        desktop: { width: 1280, height: 768 },
        tablet: { width: breakpoints.tablet - 5, height: 1024 },
        mobile: { width: 360, height: 768 },
      };
      for (const [viewport, { width, height }] of Object.entries(viewportSizes)) {
        cy.viewport(width, height);
        cy.clearSelectionAndWait(viewport as keyof typeof viewportSizes);
        cy.percySnapshot(`${name} (${viewport})`, { percyCSS, widths: [width] });
      }

      // Reset to original viewport
      cy.viewport(innerWidth, innerHeight);
      const targetViewport =
        innerWidth < breakpoints.mobile ? 'mobile' : innerWidth < breakpoints.tablet ? 'tablet' : 'desktop';
      cy.get(`html.viewport-is-${targetViewport}`).should('be.visible');
    });
  });

  cy.clearSelectionAndWait();
});

Cypress.Commands.add('testWcag', () => {
  cy.log('Testing WCAG');
  const spec = Cypress.spec.absolute.replace(/.*\/integration\//g, '');
  const axeOptions: AxeOptions = {
    includedImpacts: ['critical', 'serious', 'moderate'],
  };
  const violationsCallback = (violations: axe.Result[]) => {
    const knownHere = knownWcagViolations.filter(
      (known) => known.spec === spec && known.test === Cypress.currentTest.title,
    );
    const expectedHere = [...knownHere].filter((known) => known.countTowardsExpected === undefined);

    let foundNewViolations = false;
    let foundKnownViolations = 0;
    for (const violation of violations) {
      const asKnown: KnownViolation = {
        id: violation.id,
        spec,
        test: Cypress.currentTest.title,
        nodeLength: violation.nodes.length,
      };
      const isKnown = knownHere.some(({ id, spec, test, nodeLength }) =>
        deepEqual({ id, spec, test, nodeLength }, asKnown),
      );
      if (isKnown) {
        cy.log(`Ignoring known WCAG violation: ${violation.id}`);
        foundKnownViolations++;
        continue;
      }

      if (!foundNewViolations) {
        cy.log('-----------------------------------');
        cy.log('Found new WCAG violations:');
        cy.log(`snapshotName: ${spec}`);
        cy.log(`currentTest: ${Cypress.currentTest.title}`);
        cy.log(`known here: ${knownHere.length}`);
        cy.log(`expected here: ${expectedHere.length}`);
      }
      cy.log('-----------------------------------');
      cy.log(`id: ${violation.id}`);
      cy.log(`impact: ${violation.impact}`);
      cy.log(`descr: ${violation.description}`);
      cy.log(`help: ${violation.help}`);
      cy.log(`helpUrl: ${violation.helpUrl}`);
      cy.log(`nodeLength: ${violation.nodes.length}`);
      foundNewViolations = true;
    }

    if (foundNewViolations) {
      cy.log('-----------------------------------');

      // Forcing a failure here, as long as skipFailures is true, to ensure that we don't miss any new WCAG violations.
      cy.get('#element-does-not-exist').should('exist');
    } else if (foundKnownViolations !== expectedHere.length && foundKnownViolations !== knownHere.length) {
      cy.log(
        `Expected to find ${expectedHere.length} or ${knownHere.length} known WCAG violations, but found ${foundKnownViolations} in this test`,
      );
      cy.get('#element-does-not-exist').should('exist');
    }
  };
  const skipFailures = true; // TODO: Remove this when we have fixed all WCAG violations
  cy.checkA11y(undefined, axeOptions, violationsCallback, skipFailures);
});

Cypress.Commands.add('reloadAndWait', () => {
  cy.reload();
  cy.get('#readyForPrint').should('exist');
  cy.injectAxe();
});

Cypress.Commands.add(
  'addItemToGroup',
  (oldValue: number, newValue: number, comment: string, openByDefault?: boolean) => {
    if (!openByDefault) {
      cy.get(appFrontend.group.addNewItem).click();
    }

    cy.get(appFrontend.group.currentValue).type(`${oldValue}`);
    cy.get(appFrontend.group.currentValue).blur();
    cy.get(appFrontend.group.newValue).type(`${newValue}`);
    cy.get(appFrontend.group.newValue).blur();
    cy.get(appFrontend.group.mainGroup)
      .find(appFrontend.group.editContainer)
      .find(appFrontend.group.next)

      .click();

    if (openByDefault || typeof openByDefault === 'undefined') {
      cy.get(appFrontend.group.addNewItemSubGroup).should('not.exist');
    } else {
      cy.get(appFrontend.group.addNewItemSubGroup).click();
    }

    cy.get(appFrontend.group.comments).type(comment);
    cy.get(appFrontend.group.comments).blur();
    cy.get(appFrontend.group.saveSubGroup).clickAndGone();
    cy.get(appFrontend.group.saveMainGroup).clickAndGone();
  },
);

Cypress.Commands.add('startStatefulFromStateless', () => {
  cy.intercept('POST', '**/instances/create').as('createInstance');
  cy.get(appFrontend.instantiationButton).click();
  cy.wait('@createInstance').its('response.statusCode').should('eq', 201);
});

Cypress.Commands.add('moveProcessNext', () => {
  cy.url().then((url) => {
    const maybeInstanceId = getInstanceIdRegExp().exec(url);
    const instanceId = maybeInstanceId ? maybeInstanceId[1] : 'instance-id-not-found';
    const baseUrl =
      Cypress.env('environment') === 'local'
        ? Cypress.config().baseUrl || ''
        : `https://ttd.apps.${Cypress.config('baseUrl')?.slice(8)}`;
    const urlPath = url.replace(baseUrl, '');
    const org = urlPath.split(/[/#]/)[1];
    const app = urlPath.split(/[/#]/)[2];
    const requestUrl = `${baseUrl}/${org}/${app}/instances/${instanceId}/process/next`;

    cy.getCookie('XSRF-TOKEN').then((xsrfToken) => {
      cy.request({
        method: 'PUT',
        url: requestUrl,
        headers: {
          'X-XSRF-TOKEN': xsrfToken?.value,
        },
      })
        .its('status')
        .should('eq', 200);
    });
  });
});

Cypress.Commands.add('getReduxState', (selector) =>
  cy
    .window()
    .its('reduxStore')
    .invoke('getState')
    .then((state) => {
      if (selector) {
        return selector(state);
      }

      return state;
    }),
);

Cypress.Commands.add('reduxDispatch', (action) => cy.window().its('reduxStore').invoke('dispatch', action));

Cypress.Commands.add('interceptLayout', (taskName, mutator, wholeLayoutMutator) => {
  cy.intercept({ method: 'GET', url: `**/api/layouts/${taskName}`, times: 1 }, (req) => {
    req.reply((res) => {
      const set = JSON.parse(res.body);
      if (mutator) {
        for (const layout of Object.values(set)) {
          (layout as any).data.layout.map(mutator);
        }
      }
      if (wholeLayoutMutator) {
        wholeLayoutMutator(set);
      }
      res.send(JSON.stringify(set));
    });
  }).as(`interceptLayout(${taskName})`);
});

Cypress.Commands.add('changeLayout', (mutator, wholeLayoutMutator) => {
  cy.window().then((win) => {
    const state = win.reduxStore.getState();
    const layouts: ILayouts = structuredClone(state.formLayout.layouts || {});
    if (mutator && layouts) {
      for (const layout of Object.values(layouts)) {
        for (const component of layout || []) {
          mutator(component);
        }
      }
    }
    if (wholeLayoutMutator) {
      wholeLayoutMutator(layouts);
    }
    win.reduxStore.dispatch({
      type: 'formLayout/updateLayouts',
      payload: layouts,
    });
  });
});

Cypress.Commands.add('interceptLayoutSetsUiSettings', (uiSettings) => {
  cy.intercept('GET', '**/api/layoutsets', (req) => {
    req.continue((res) => {
      const body = JSON.parse(res.body);
      res.body = JSON.stringify({
        ...body,
        uiSettings: { ...body.uiSettings, ...uiSettings },
      });
    });
  }).as('layoutSets');
});

Cypress.Commands.add('getSummary', (label) => {
  cy.get(`[data-testid^=summary-]:has(span:contains(${label}))`);
});

Cypress.Commands.add('testPdf', (callback, returnToForm = false) => {
  cy.log('Testing PDF');

  // Make sure instantiation is completed before we get the url
  cy.location('hash').should('contain', '#/instance/');

  // Make sure we blur any selected component before reload to trigger save
  cy.get('body').click();

  // Wait for network to be idle before calling reload
  cy.waitForNetworkIdle('*', '*', 500);

  // Visit the PDF page and reload
  cy.location('href').then((href) => {
    cy.visit(`${href}?pdf=1`);
  });
  cy.reload();

  // Wait for readyForPrint, after this everything should be rendered so using timeout: 0
  cy.get('#pdfView > #readyForPrint')
    .should('exist')
    .then({ timeout: 0 }, () => {
      // Run tests from callback
      callback();
    });

  if (returnToForm) {
    cy.location('href').then((href) => {
      cy.visit(href.replace('?pdf=1', ''));
    });
    cy.get('#pdfView > #readyForPrint').should('not.exist');
    cy.get('#readyForPrint').should('exist');
  }
});
