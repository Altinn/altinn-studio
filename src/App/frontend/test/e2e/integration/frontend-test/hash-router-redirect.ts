import { AppFrontend } from 'test/e2e/pageobjects/app-frontend';

const appFrontend = new AppFrontend();
const appName = appFrontend.apps.frontendTest;

describe('Hash Router Redirect', () => {
  describe('when hash route is present', () => {
    it('redirects hash route to browser route', () => {
      cy.startAppInstance(appName, { urlSuffix: '#/instance-selection' });
      cy.url().should((url) => {
        const urlObj = new URL(url);
        expect(urlObj.pathname).to.match(/\/instance-selection$/);
        expect(urlObj.hash).to.equal('');
      });
    });
  });

  describe('when hash route has query parameters', () => {
    it('preserves lang query parameter from hash', () => {
      cy.startAppInstance(appName, { urlSuffix: '#/instance-selection?lang=en' });
      cy.url().should((url) => {
        const urlObj = new URL(url);
        expect(urlObj.pathname).to.match(/\/instance-selection$/);
        expect(urlObj.hash).to.equal('');
        expect(urlObj.searchParams.get('lang')).to.equal('en');
      });
    });

    it('preserves query parameters from outside hash', () => {
      cy.startAppInstance(appName, { urlSuffix: '?lang=en#/instance-selection' });
      cy.url().should((url) => {
        const urlObj = new URL(url);
        expect(urlObj.pathname).to.match(/\/instance-selection$/);
        expect(urlObj.hash).to.equal('');
        expect(urlObj.searchParams.get('lang')).to.equal('en');
      });
    });

    it('merges query params with hash params taking priority', () => {
      cy.startAppInstance(appName, { urlSuffix: '?lang=nb#/instance-selection?lang=en' });
      cy.url().should((url) => {
        const urlObj = new URL(url);
        expect(urlObj.pathname).to.match(/\/instance-selection$/);
        expect(urlObj.hash).to.equal('');
        expect(urlObj.searchParams.get('lang')).to.equal('en');
      });
    });
  });

  describe('when no redirect should occur', () => {
    it('does not redirect when there is no hash', () => {
      cy.startAppInstance(appName);
      cy.url().should((url) => {
        expect(url).to.include(`/${appName}`);
        expect(url).to.not.include('#');
      });
    });
  });
});
