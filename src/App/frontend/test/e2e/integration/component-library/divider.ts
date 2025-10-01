import { AppFrontend } from 'test/e2e/pageobjects/app-frontend';

const appFrontend = new AppFrontend();

describe('Divider component', () => {
  it('Renders the summary2 component with correct text for Checkboxes', () => {
    cy.startAppInstance(appFrontend.apps.componentLibrary, { authenticationLevel: '2' });
    cy.gotoNavPage('Divider');

    cy.visualTesting('divider');
  });
});
