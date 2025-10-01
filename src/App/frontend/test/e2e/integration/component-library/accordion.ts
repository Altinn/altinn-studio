import { AppFrontend } from 'test/e2e/pageobjects/app-frontend';

const appFrontend = new AppFrontend();

describe('Accordion component', () => {
  it('Renders accordion correctly', () => {
    cy.startAppInstance(appFrontend.apps.componentLibrary, { authenticationLevel: '2' });
    cy.gotoNavPage('AccordionPage');

    cy.visualTesting('accordion');
  });
});
