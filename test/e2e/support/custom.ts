import 'cypress-wait-until';

import deepEqual from 'fast-deep-equal';
import type axe from 'axe-core';
import type { Options as AxeOptions } from 'cypress-axe';

import { AppFrontend } from 'test/e2e/pageobjects/app-frontend';

import { breakpoints } from 'src/hooks/useIsMobile';
import { getInstanceIdRegExp } from 'src/utils/instanceIdRegExp';
import type { LayoutContextValue } from 'src/features/form/layout/LayoutsContext';
import JQueryWithSelector = Cypress.JQueryWithSelector;
import type { ILayoutFile } from 'src/layout/common.generated';

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

Cypress.Commands.add('waitUntilSaved', () => {
  // If the data-unsaved-changes attribute does not exist, the page is not in a data/form state, and we should not
  // wait for it to be saved.
  cy.get('body').should('not.have.attr', 'data-unsaved-changes', 'true');
});

Cypress.Commands.add('waitUntilNodesReady', () => {
  cy.get('body').should('not.have.attr', 'data-nodes-ready', 'false');
  cy.get('body').should('not.have.attr', 'data-commits-pending', 'true');
});

Cypress.Commands.add('dsReady', (selector) => {
  // In case the option is dynamic, wait for save and progress bars to go away, otherwise the component could
  // rerender after opening, causing it to close again
  cy.findByRole('progressbar').should('not.exist');

  cy.get(selector).should('not.be.disabled');
  cy.waitUntilSaved();
  cy.waitUntilNodesReady();
});

Cypress.Commands.add('dsSelect', (selector, value) => {
  cy.log(`Selecting ${value} in ${selector}`);
  cy.dsReady(selector);
  cy.get(selector).click();

  // It is tempting to just use findByRole('option', { name: value }) here, but that's flakier than using findByText()
  // as it never retries if the element re-renders. More information here:
  // https://github.com/testing-library/cypress-testing-library/issues/205#issuecomment-974688283
  cy.get('[class*="fds-combobox__option"]').findByText(value).click();

  cy.get('body').click();
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

  cy.get(subject.selector!).type(`${moveToStart}${del}`);
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
    test: 'Opens delete warning popup when alertOnDelete is true and deletes on confirm',
    id: 'aria-dialog-name',
    nodeLength: 1,
  },
  {
    spec: 'frontend-test/group-pets.ts',
    test: 'should be possible to add predefined pets, sort them, validate them, hide them and delete them',
    id: 'color-contrast',
    nodeLength: 2,
  },
  {
    spec: 'frontend-test/group-pets.ts',
    test: 'should snapshot the decision panel',
    id: 'color-contrast',
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
  cy.findByRole('progressbar').should('not.exist');

  // Find focused element and blur it, to ensure that we don't get any focus outlines or styles in the snapshot.
  cy.window().then((win) => {
    const focused = win.document.activeElement;
    if (focused && 'blur' in focused && typeof focused.blur === 'function') {
      focused.blur();
    }
  });

  cy.focused().should('not.exist');

  // Wait for elements marked as loading are not loading anymore
  cy.get('[data-is-loading=true]').should('not.exist');

  if (viewport) {
    cy.get(`html.viewport-is-${viewport}`).should('be.visible');
  }

  // Work around slow state updates in Dropdown (possibly in combination with preselectedOptionIndex)
  cy.window().then((win) => {
    const layoutCache = win.queryClient.getQueriesData({
      queryKey: ['formLayouts'],
    })?.[0]?.[1] as LayoutContextValue | undefined;
    const layouts = layoutCache?.layouts;
    cy.waitUntil(() => {
      const allDropdowns = win.document.querySelectorAll('[data-componenttype="Dropdown"]');
      const asArray = Array.from(allDropdowns);
      for (const dropdown of asArray) {
        const inputInside = dropdown.querySelector('input');
        if (!inputInside) {
          return cy.wrap(false);
        }
        const baseId = dropdown.getAttribute('data-componentbaseid');

        cy.getCurrentPageId().then((currentPageId) => {
          const currentPage = layouts?.[currentPageId];
          const componentDef = currentPage?.find((c) => c.id === baseId);
          if (!componentDef) {
            // throw new Error(`Could not find component definition for dropdown with id ${baseId}`);
          }
          if (
            componentDef?.type === 'Dropdown' &&
            componentDef?.preselectedOptionIndex !== undefined &&
            !inputInside.value
          ) {
            return cy.wrap(false);
          }

          const activeDescendant = dropdown.getAttribute('aria-activedescendant');
          if (!activeDescendant) {
            return cy.wrap(true);
          }
          const activeDescendantElement = win.document.getElementById(activeDescendant);
          if ((activeDescendant && !inputInside.value) || !activeDescendantElement) {
            // Dropdown has selected value, but this has not yet been reflected in the input field value.
            // We should wait until this has happened.
            return cy.wrap(false);
          }
        });
      }

      return cy.wrap(true);
    });
  });
});

Cypress.Commands.add('getCurrentPageId', () => cy.location('hash').then((hash) => hash.split('/').slice(-1)[0]));

Cypress.Commands.add('snapshot', (name: string) => {
  cy.clearSelectionAndWait();
  cy.waitUntilSaved();

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
  cy.waitUntilSaved();
  cy.reload();
  cy.get('#readyForPrint').should('exist');
  cy.findByRole('progressbar').should('not.exist');
  cy.injectAxe();
});

Cypress.Commands.add('waitForLoad', () => {
  cy.get('#readyForPrint').should('exist');
  cy.findByRole('progressbar').should('not.exist');
  // An initialOption can cause a save to occur immediately after loading is finished, wait for this to finish as well
  cy.waitUntilSaved();
  cy.log('App finished loading');
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
    cy.get(appFrontend.group.mainGroup).find(appFrontend.group.editContainer).find(appFrontend.group.next).click();

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
      Cypress.env('type') === 'localtest'
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

Cypress.Commands.add('interceptLayout', (taskName, mutator, wholeLayoutMutator) => {
  cy.intercept({ method: 'GET', url: `**/api/layouts/${taskName}`, times: 1 }, (req) => {
    req.reply((res) => {
      const set = JSON.parse(res.body);
      if (mutator) {
        for (const layout of Object.values(set)) {
          (layout as ILayoutFile).data.layout.map(mutator);
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
  cy.log('Changing current layout');
  cy.window().then((win) => {
    const activeData = win.queryClient.getQueryCache().findAll({ type: 'active' });
    for (const query of activeData) {
      if (Array.isArray(query.queryKey) && query.queryKey[0] === 'formLayouts') {
        const copy = structuredClone(query.state.data) as LayoutContextValue | undefined;
        if (copy) {
          if (mutator) {
            for (const page of Object.values(copy.layouts)) {
              for (const component of page || []) {
                mutator(component);
              }
            }
          }
          if (wholeLayoutMutator) {
            wholeLayoutMutator(copy.layouts);
          }

          win.queryClient.setQueryData(query.queryKey, copy);
        }
      }
    }
  });

  // To make sure we actually wait for the layout change to become effective, we first wait for the loader to appear,
  // and then wait for it to disappear.
  cy.get('[data-testid="loader"]').should('exist');
  cy.get('[data-testid="loader"]').should('not.exist');

  cy.get('#readyForPrint').should('exist');
  cy.findByRole('progressbar').should('not.exist');
  cy.waitUntilNodesReady();
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

const DEFAULT_COMMAND_TIMEOUT = Cypress.config().defaultCommandTimeout;
Cypress.Commands.add('testPdf', (callback, returnToForm = false) => {
  cy.log('Testing PDF');

  // Make sure instantiation is completed before we get the url
  cy.location('hash').should('contain', '#/instance/');

  // Make sure we blur any selected component before reload to trigger save
  cy.get('body').click();

  // Wait for network to be idle before calling reload
  cy.waitUntilSaved();
  cy.waitForNetworkIdle('*', '*', 500);

  // Visit the PDF page and reload
  cy.location('href').then((href) => {
    const regex = getInstanceIdRegExp();
    const instanceId = regex.exec(href)?.[1];
    const before = href.split(regex)[0];
    const visitUrl = `${before}${instanceId}?pdf=1`;

    // After the navigation rewrite where we now add the current task ID to the URL, this test is only realistic if
    // we remove the task and page from the URL before rendering the PDF. This is because the real PDF generator
    // won't know about the task and page, and will load this URL and assume the app will figure out how to display
    // the current task as a PDF.
    cy.visit(visitUrl);
  });
  cy.reload();

  // Wait for readyForPrint, after this everything should be rendered so using timeout: 0
  cy.get('#pdfView > #readyForPrint')
    .should('exist')
    .then(() => {
      Cypress.config('defaultCommandTimeout', 0);

      // Verify that generic elements that should be hidden are not present
      cy.findAllByRole('button').should('not.exist');
      // Run tests from callback
      callback();

      cy.then(() => {
        Cypress.config('defaultCommandTimeout', DEFAULT_COMMAND_TIMEOUT);
      });
    });

  if (returnToForm) {
    cy.location('href').then((href) => {
      cy.visit(href.replace('?pdf=1', ''));
    });
    cy.get('#pdfView > #readyForPrint').should('not.exist');
    cy.get('#readyForPrint').should('exist');
  }
});

Cypress.Commands.add(
  'iframeCustom',
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-expect-error
  { prevSubject: 'element' },
  ($iframe: JQueryWithSelector) =>
    new Cypress.Promise((resolve) => {
      $iframe.ready(function () {
        resolve($iframe.contents().find('body'));
      });
    }),
);

Cypress.Commands.add('allowFailureOnEnd', function () {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (this.test as any).__allowFailureOnEnd = true;
});
