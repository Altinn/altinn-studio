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

import { AppFrontend } from 'test/e2e/pageobjects/app-frontend';
import { chaiExtensions } from 'test/e2e/support/chai-extensions';

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

  const testName = this.currentTest?.fullTitle();
  const title = this.currentTest?.title.replace(/\s+/g, '-').replace(/[^a-zA-Z\-0-9_]/g, '');
  const specBaseName = Cypress.spec.relative.split(/[\\/]/).pop()?.split('.')[0];
  const fileName = `log-${specBaseName}-${title}.txt`;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  cy.window().then((win: any) => {
    if (Array.isArray(win._cyLog) && win._cyLog.length > 0 && win._cyLogSave === true) {
      const log: string[] = [
        '==================================================',
        `Test: ${testName}`,
        `Title: ${this.currentTest?.title}`,
        `Spec: ${Cypress.spec.relative}`,
        '',
        ...win._cyLog,
        '',
      ];
      cy.writeFile(`test/logs/${fileName}`, log.join('\n'), { flag: 'a+' });
    }
  });
});
