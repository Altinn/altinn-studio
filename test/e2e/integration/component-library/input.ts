import { fillInInputAndVerify } from 'test/e2e/integration/component-library/utils/inputAndVerify';
import { AppFrontend } from 'test/e2e/pageobjects/app-frontend';

const appFrontend = new AppFrontend();

describe('Input component', () => {
  it('Renders the summary2 component with correct text', () => {
    cy.startAppInstance(appFrontend.apps.componentLibrary, { authenticationLevel: '2' });
    fillInInputAndVerify('I type some text');
  });
});
