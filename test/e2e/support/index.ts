import '@testing-library/cypress/add-commands';
import 'cypress-axe';
import 'cypress-plugin-tab';
import 'cypress-network-idle';
import 'test/e2e/support/custom';
import 'test/e2e/support/start-app-instance';
import 'test/e2e/support/global';
import 'test/e2e/support/auth';
import 'test/e2e/support/navigation';
import 'test/e2e/support/formFiller';
import '@percy/cypress';

import failOnConsoleError from 'cypress-fail-on-console-error';

import { AppFrontend } from 'test/e2e/pageobjects/app-frontend';
import { chaiExtensions } from 'test/e2e/support/chai-extensions';
import { ignoredConsoleMessages } from 'test/e2e/support/fail-on-console-log';

const appFrontend = new AppFrontend();

before(() => {
  chai.use(chaiExtensions);
});

const DEFAULT_COMMAND_TIMEOUT = Cypress.config().defaultCommandTimeout;
// Clear media emulation and reset default command timeout before each test
beforeEach(() => {
  cy.then(() => Cypress.config('defaultCommandTimeout', DEFAULT_COMMAND_TIMEOUT));
  cy.wrap(
    Cypress.automation('remote:debugger:protocol', {
      command: 'Emulation.setEmulatedMedia',
      params: {},
    }),
    { log: false },
  );
});

afterEach(function () {
  if (this.currentTest?.state !== 'failed') {
    cy.waitUntilSaved();
    cy.waitUntilNodesReady();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (this.currentTest && (this.currentTest as any).__allowFailureOnEnd === undefined) {
      cy.log('Making sure no errors happened after the test run. Call cy.allowFailureOnEnd() to disable this check.');
      cy.get(appFrontend.instanceErrorCode).should('not.exist');
    }
  }
});

// When running Cypress tests, we want to fail immediately if there are any console errors, or even logging
// of warnings, etc. This will help us catch issues early.
failOnConsoleError({
  consoleTypes: ['error', 'warn', 'info', 'trace'],
  consoleMessages: ignoredConsoleMessages,
});
