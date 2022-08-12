import './localtest';
import './app-frontend';
import './custom';
import 'cypress-plugin-tab';
import './start-app-instance';
import './wcag';
import 'cypress-axe';
import chaiExtensions from './chai-extensions';

before(() => {
  chai.use(chaiExtensions);
});

const failedCaseTable = {};
afterEach(function () {
  if (this.currentTest.state === 'failed') {
    const testName = this.currentTest.fullTitle();

    // Remember the test case retry times
    if (failedCaseTable[testName]) {
      failedCaseTable[testName] += 1;
    } else {
      failedCaseTable[testName] = 1;
    }

    const title = this.currentTest.title.replace(/\s+/, '-').replace(/[^a-zA-Z\-0-9_]/, '');
    const specBaseName = Cypress.spec.relative.split(/[\\\/]/).pop().split('.')[0];
    const attempt = `failed${failedCaseTable[testName]}`;
    const fileName = `redux-${specBaseName}-${title}-${attempt}.json`;

    cy.window().then((win) => {
      if (win.reduxActionLog && win.reduxStore) {
        // This object does approximately what the export function from redux-devtools does:
        // https://github.com/reduxjs/redux-devtools/blob/b82de745928211cd9b7daa7a61b197ad9e11ec36/extension/src/browser/extension/inject/pageScript.ts#L220-L226
        const history = {
          payload: JSON.stringify(win.reduxActionLog),
          preloadedState: JSON.stringify(win.reduxStore.getState()),
        };
        cy.writeFile(`redux-history/${fileName}`, JSON.stringify(history, null, 2));
      }
    });
  }
});
