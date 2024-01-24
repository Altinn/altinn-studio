import '@testing-library/cypress/add-commands';
import 'cypress-wait-until';
import 'cypress-axe';
import 'cypress-plugin-tab';
import 'cypress-network-idle';
import 'test/e2e/support/custom';
import 'test/e2e/support/start-app-instance';
import 'test/e2e/support/auth';
import 'test/e2e/support/navigation';
import 'test/e2e/support/formFiller';
import '@percy/cypress';

import { chaiExtensions } from 'test/e2e/support/chai-extensions';

before(() => {
  chai.use(chaiExtensions);
});

afterEach(function () {
  const testName = this.currentTest?.fullTitle();
  const title = this.currentTest?.title.replace(/\s+/g, '-').replace(/[^a-zA-Z\-0-9_]/g, '');
  const specBaseName = Cypress.spec.relative.split(/[\\/]/).pop()?.split('.')[0];
  const fileName = `log-${specBaseName}-${title}.txt`;

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
