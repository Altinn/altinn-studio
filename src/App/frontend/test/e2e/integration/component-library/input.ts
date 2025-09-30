import { AppFrontend } from 'test/e2e/pageobjects/app-frontend';
import { fillInInputAndVerify } from 'test/e2e/support/apps/component-library/inputAndVerify';

const appFrontend = new AppFrontend();

describe('Input component', () => {
  it('Renders the summary2 component with correct text', () => {
    cy.startAppInstance(appFrontend.apps.componentLibrary, { authenticationLevel: '2' });
    fillInInputAndVerify('I type some text');
  });
});
