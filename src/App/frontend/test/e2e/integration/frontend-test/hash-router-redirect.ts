import { AppFrontend } from 'test/e2e/pageobjects/app-frontend';

const appFrontend = new AppFrontend();
const appName = appFrontend.apps.frontendTest;

function shouldRedirectTo(expectedPath: string): void {
  cy.url().should('satisfy', (url: string) => url.endsWith(expectedPath));
}

function shouldContainAll(...segments: string[]): void {
  cy.url().should('satisfy', (url: string) => segments.every((segment) => url.includes(segment)));
}

function shouldNotContain(segment: string): void {
  cy.url().should('satisfy', (url: string) => !url.includes(segment));
}

describe('Hash Router Redirect', () => {
  describe('when hash route is present', () => {
    it('redirects hash route to browser route and loads app', () => {
      cy.startAppInstance(appName, { urlSuffix: '#/instance-selection' });
      shouldRedirectTo('/instance-selection');
    });
  });

  describe('when hash route has query parameters', () => {
    it('preserves lang query parameter from hash', () => {
      cy.startAppInstance(appName, { urlSuffix: '#/instance-selection?lang=en' });
      shouldContainAll('/instance-selection', 'lang=en');
    });

    it('preserves query parameters from outside hash', () => {
      cy.startAppInstance(appName, { urlSuffix: '?lang=en#/instance-selection' });
      shouldContainAll('/instance-selection', 'lang=en');
    });

    it('merges query params with hash params taking priority', () => {
      cy.startAppInstance(appName, { urlSuffix: '?lang=nb#/instance-selection?lang=en' });
      shouldContainAll('/instance-selection', 'lang=en');
      shouldNotContain('lang=nb');
    });
  });

  describe('when no redirect should occur', () => {
    it('does not redirect when there is no hash', () => {
      cy.startAppInstance(appName);
      cy.url().should('include', `/${appName}`);
      cy.url().should('not.include', '#');
    });
  });
});
