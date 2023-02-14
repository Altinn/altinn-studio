import '@testing-library/cypress/add-commands';
import 'cypress-wait-until';
import 'cypress-axe';
import 'cypress-plugin-tab';
import 'test/e2e/support/app-frontend';
import 'test/e2e/support/navigation';
import 'test/e2e/support/custom';
import 'test/e2e/support/start-app-instance';
import 'test/e2e/support/wcag';

import chaiExtensions from 'test/e2e/support/chai-extensions';

import type { IAltinnWindow } from 'src/types';

before(() => {
  chai.use(chaiExtensions);
});

const failedCaseTable = {};
afterEach(function () {
  if (this.currentTest?.state === 'failed') {
    const testName = this.currentTest.fullTitle();

    // Remember the test case retry times
    if (failedCaseTable[testName]) {
      failedCaseTable[testName] += 1;
    } else {
      failedCaseTable[testName] = 1;
    }

    const title = this.currentTest.title.replace(/\s+/, '-').replace(/[^a-zA-Z\-0-9_]/, '');
    const specBaseName = Cypress.spec.relative.split(/[\\/]/).pop()?.split('.')[0];
    const attempt = `failed${failedCaseTable[testName]}`;
    const fileName = `redux-${specBaseName}-${title}-${attempt}.json`;

    cy.window().then((win) => {
      const aWin = win as unknown as IAltinnWindow;
      if (aWin.reduxActionLog && aWin.reduxStore) {
        // This object does approximately what the export function from redux-devtools does:
        // https://github.com/reduxjs/redux-devtools/blob/b82de745928211cd9b7daa7a61b197ad9e11ec36/extension/src/browser/extension/inject/pageScript.ts#L220-L226
        const history = {
          payload: JSON.stringify(aWin.reduxActionLog),
          preloadedState: JSON.stringify(aWin.reduxStore.getState()),
        };
        cy.writeFile(`test/redux-history/${fileName}`, JSON.stringify(history, null, 2));
      }
    });
  }
});
