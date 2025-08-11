import { AppFrontend } from 'test/e2e/pageobjects/app-frontend';

const appFrontend = new AppFrontend();

describe('AccordionGroup component', () => {
  it('Renders accordion-group correctly', () => {
    cy.startAppInstance(appFrontend.apps.componentLibrary, { authenticationLevel: '2' });
    cy.gotoNavPage('AccordionGroupPage');

    cy.visualTesting('accordion-group');
  });
});
